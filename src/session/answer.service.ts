import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { addDays, todayWIB } from '../common/wib';
import { StorageService } from '../storage/storage.service';
import { STT_TRANSCRIBER } from '../speech/groq-stt.service';
import type { SttTranscriber } from '../speech/groq-stt.service';
import { gradeAnswer } from './grading';
import { COUNTED_SESSION_KINDS } from '../common/content-scope';

// WIB day boundaries, expressed as real UTC instants (see src/common/wib.ts —
// todayWIB()/addDays() return the WIB *calendar day* encoded as a UTC
// midnight placeholder; the real-time instant a WIB day starts is 7h
// earlier in UTC).
const H7 = 7 * 3600_000;

/**
 * Task 5 wires the real StreakService (src/me/streak.service.ts) as the
 * STREAK_EVALUATOR provider. It takes `tx` explicitly — not just userId —
 * because this is invoked from INSIDE the $transaction below, right after
 * marking the session COMPLETED but before the transaction commits. A query
 * through a separate PrismaService connection wouldn't see that uncommitted
 * completion yet, so the streak/changed/milestone computation must run
 * against the same transaction client to count today's session correctly.
 */
export interface StreakEvaluator {
  evaluateAfterSession(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{
    streak: number;
    changed: boolean;
    milestone: 7 | 30 | 100 | null;
  }>;
}

export const STREAK_EVALUATOR = Symbol('STREAK_EVALUATOR');

export interface AnswerResult {
  correct: boolean;
  explanation: string;
  correctAnswer: string | null; // hanya diisi saat salah
  transcript: string | null; // UCAPAN: apa yang dideteksi STT
  xpAwarded: number;
  sessionCompleted: boolean;
  summary: null | {
    xpSession: number;
    accuracyFirstTry: number; // 0-100
    streak: number;
    streakChanged: boolean;
    milestone: 7 | 30 | 100 | null;
  };
}

@Injectable()
export class AnswerService {
  constructor(
    private prisma: PrismaService,
    private config: AppConfigService,
    private storage: StorageService,
    @Inject(STREAK_EVALUATOR) private streakEvaluator: StreakEvaluator,
    @Inject(STT_TRANSCRIBER) private stt: SttTranscriber,
  ) {}

  async submit(
    userId: string,
    sessionId: string,
    itemId: string,
    answer: string,
  ): Promise<AnswerResult> {
    // gradeAnswer() calls String methods on `answer` unconditionally — guard
    // here so a malformed body (missing/non-string answer) is a clean 400
    // instead of an uncaught TypeError bubbling up as a 500.
    if (typeof answer !== 'string') {
      throw new BadRequestException('answer wajib diisi');
    }
    return this.commitAttempt(userId, sessionId, itemId, answer);
  }

  /**
   * Jalur jawaban tipe UCAPAN: consent wajib, simpan rekaman permanen,
   * transcribe via Groq, lalu commit attempt seperti jawaban teks biasa.
   * STT (jaringan) berjalan di LUAR transaksi DB — guard sesi/soal di-check
   * dua kali: pre-check murah di sini (hindari buang call Groq) dan re-check
   * di dalam commitAttempt (race-safety).
   */
  async submitSpeech(
    userId: string,
    sessionId: string,
    itemId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<AnswerResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.voiceConsentAt) {
      throw new ForbiddenException('Konsen rekaman suara belum diberikan');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });
    if (!session || session.userId !== userId) throw new NotFoundException();
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Sesi sudah selesai');
    }
    if (!session.items.some((si) => si.itemId === itemId)) {
      throw new NotFoundException();
    }
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException();
    if (item.type !== 'UCAPAN') {
      throw new BadRequestException('Soal bukan tipe ucapan');
    }
    const alreadyCorrect = await this.prisma.attempt.findFirst({
      where: { sessionId, itemId, correct: true },
    });
    if (alreadyCorrect) {
      throw new BadRequestException('Soal ini sudah dijawab benar');
    }

    // Simpan permanen (keputusan produk: rekaman dipertahankan). Naming:
    // speech/{sessionId}/{itemId}/{ts}-{rand}.{ext}. Orphan bila transaksi
    // gagal setelah ini — terima, tanpa cron/cleanup di Rilis 1.
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    const name = `speech/${sessionId}/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    await this.storage.put(name, file.buffer);

    const transcript = await this.stt.transcribe(file.buffer, file.mimetype);

    // Transcript kosong = jawaban salah biasa (gradeAnswer kembali false),
    // bukan error — user kirim rekaman diam, tercatat sebagai attempt salah.
    return this.commitAttempt(userId, sessionId, itemId, transcript, name);
  }

  /**
   * Inti penilaian + pencatatan attempt (XP, review queue, completion,
   * streak) — dipakai bersama submit() dan submitSpeech(). Grading tetap
   * fungsi murni gradeAnswer(); config dibaca di luar `tx` karena tabel
   * config tak pernah dimutasi transaksi ini.
   */
  private async commitAttempt(
    userId: string,
    sessionId: string,
    itemId: string,
    answer: string,
    audioFile?: string,
  ): Promise<AnswerResult> {
    const [
      xpFirstTry,
      xpRetry,
      xpSessionComplete,
      xpPerfectSession,
      xpReviewCap,
      speakingThreshold,
    ] = await Promise.all([
      this.config.getInt('XP_FIRST_TRY'),
      this.config.getInt('XP_RETRY'),
      this.config.getInt('XP_SESSION_COMPLETE'),
      this.config.getInt('XP_PERFECT_SESSION'),
      this.config.getInt('XP_DAILY_REVIEW_CAP'),
      this.config.getInt('SPEAKING_MATCH_THRESHOLD'),
    ]);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { items: true },
      });
      if (!session || session.userId !== userId) throw new NotFoundException();
      if (session.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Sesi sudah selesai');
      }

      const sessionItem = session.items.find((si) => si.itemId === itemId);
      if (!sessionItem) throw new NotFoundException();

      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException();

      const alreadyCorrect = await tx.attempt.findFirst({
        where: { sessionId, itemId, correct: true },
      });
      if (alreadyCorrect) {
        throw new BadRequestException('Soal ini sudah dijawab benar');
      }

      const correct = gradeAnswer(
        {
          type: item.type,
          answerKey: item.answerKey,
          acceptedAnswers: item.acceptedAnswers,
          threshold:
            item.type === 'UCAPAN' ? speakingThreshold : undefined,
        },
        answer,
      );

      const priorAttempt = await tx.attempt.findFirst({
        where: { userId, itemId },
      });
      const firstTry = !priorAttempt;

      let xpAwarded = 0;
      if (correct) {
        xpAwarded = firstTry ? xpFirstTry : xpRetry;
        if (sessionItem.source === 'REVIEW') {
          const usedToday = await this.reviewXpToday(tx, userId);
          if (usedToday >= xpReviewCap) xpAwarded = 0;
        }
      }

      let correctAnswer: string | null = null;
      if (!correct) {
        if (item.type === 'PILIHAN_GANDA') {
          const options = (item.options as string[] | null) ?? [];
          const idx = item.answerKey.trim().toUpperCase().charCodeAt(0) - 65;
          correctAnswer = options[idx] ?? item.answerKey;
        } else if (item.type === 'ISIAN') {
          correctAnswer = item.acceptedAnswers[0] ?? item.answerKey;
        } else {
          correctAnswer = item.answerKey;
        }
      }

      // 4. Attempt append-only.
      await tx.attempt.create({
        data: {
          userId,
          itemId,
          sessionId,
          answer,
          correct,
          firstTry,
          xpAwarded,
          ...(audioFile ? { audioFile } : {}),
        },
      });

      // 5. review_queue upsert / SM-2-ish progression.
      if (!correct) {
        await tx.reviewQueue.upsert({
          where: { userId_itemId: { userId, itemId } },
          create: {
            userId,
            itemId,
            dueDate: addDays(todayWIB(), 1),
            correctStreak: 0,
          },
          update: { dueDate: addDays(todayWIB(), 1), correctStreak: 0 },
        });
      } else if (sessionItem.source === 'REVIEW') {
        const rq = await tx.reviewQueue.findUnique({
          where: { userId_itemId: { userId, itemId } },
        });
        if (rq) {
          // Ladder is POST-increment: the initial "due tomorrow" (set when
          // the item was first answered wrong, above) already counts as the
          // "1" rung, so the first correct-in-review answer lands on rung 2
          // (+3 days), the second on rung 3 (+7 days), and the third (streak
          // >=3) masters the item out of the queue entirely.
          const newStreak = rq.correctStreak + 1;
          if (newStreak >= 3) {
            await tx.reviewQueue.delete({
              where: { userId_itemId: { userId, itemId } },
            });
          } else {
            const days = [1, 3, 7][Math.min(newStreak, 2)];
            await tx.reviewQueue.update({
              where: { userId_itemId: { userId, itemId } },
              data: {
                correctStreak: newStreak,
                dueDate: addDays(todayWIB(), days),
              },
            });
          }
        }
      }

      // 6. Session completion?
      const allItemIds = session.items.map((si) => si.itemId);
      const correctAttempts = await tx.attempt.findMany({
        where: { sessionId, correct: true },
        select: { itemId: true },
      });
      const correctSet = new Set(correctAttempts.map((a) => a.itemId));
      const sessionCompleted = allItemIds.every((id) => correctSet.has(id));

      let summary: AnswerResult['summary'] = null;
      if (sessionCompleted) {
        const allAttempts = await tx.attempt.findMany({
          where: { sessionId },
          orderBy: [{ answeredAt: 'asc' }, { id: 'asc' }],
          select: { itemId: true, correct: true },
        });
        const firstInSession = new Map<string, boolean>();
        for (const a of allAttempts) {
          if (!firstInSession.has(a.itemId))
            firstInSession.set(a.itemId, a.correct);
        }
        const correctFirstCount = allItemIds.filter(
          (id) => firstInSession.get(id) === true,
        ).length;
        const accuracyFirstTry = allItemIds.length
          ? Math.round((correctFirstCount / allItemIds.length) * 100)
          : 0;
        const perfect = correctFirstCount === allItemIds.length;

        let bonusXp = 0;
        if (COUNTED_SESSION_KINDS.includes(session.kind)) {
          bonusXp += xpSessionComplete;
          if (perfect) bonusXp += xpPerfectSession;
        }

        await tx.session.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            xpAwarded: bonusXp,
          },
        });

        const streakResult = await this.streakEvaluator.evaluateAfterSession(
          userId,
          tx,
        );

        // I1 fix: `bonusXp` is only the session-complete/perfect-session
        // bonus — the celebration screen showing just that understates a
        // session's real reward (and a replayed/reloaded summary would show
        // 0 for a REPLAY session, which never awards a bonus at all). Sum
        // every attempt's xpAwarded for this session and add the bonus on
        // top, so xpSession matches what the user actually earned.
        const xpAgg = await tx.attempt.aggregate({
          where: { sessionId },
          _sum: { xpAwarded: true },
        });
        const xpSession = (xpAgg._sum.xpAwarded ?? 0) + bonusXp;

        summary = {
          xpSession,
          accuracyFirstTry,
          streak: streakResult.streak,
          streakChanged: streakResult.changed,
          milestone: streakResult.milestone,
        };
      }

      return {
        correct,
        explanation: item.explanation,
        correctAnswer,
        transcript: item.type === 'UCAPAN' ? answer : null,
        xpAwarded,
        sessionCompleted,
        summary,
      };
    });
  }

  /**
   * Total xp already awarded today (WIB) from attempts on REVIEW-sourced
   * session items for this user, used to enforce XP_DAILY_REVIEW_CAP.
   */
  private async reviewXpToday(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<number> {
    const rangeStart = new Date(todayWIB().getTime() - H7);
    const rangeEnd = new Date(addDays(todayWIB(), 1).getTime() - H7);
    const todaysAttempts = await tx.attempt.findMany({
      where: { userId, answeredAt: { gte: rangeStart, lt: rangeEnd } },
      select: { sessionId: true, itemId: true, xpAwarded: true },
    });
    if (!todaysAttempts.length) return 0;

    const reviewItems = await tx.sessionItem.findMany({
      where: {
        source: 'REVIEW',
        OR: todaysAttempts.map((a) => ({
          sessionId: a.sessionId,
          itemId: a.itemId,
        })),
      },
      select: { sessionId: true, itemId: true },
    });
    const reviewKeys = new Set(
      reviewItems.map((si) => `${si.sessionId}:${si.itemId}`),
    );
    return todaysAttempts
      .filter((a) => reviewKeys.has(`${a.sessionId}:${a.itemId}`))
      .reduce((sum, a) => sum + a.xpAwarded, 0);
  }
}
