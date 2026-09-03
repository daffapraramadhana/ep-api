import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { todayWIB, weekStartWIB } from '../common/wib';
// Nest 11 tidak mengekspor TooManyRequestsException → pakai HttpException 429.
// `ElevenLabsClient` import type: cuma tipe di parameter ber-@Inject.
import { ELEVENLABS_CLIENT } from './elevenlabs-client.service';
import type { ElevenLabsClient } from './elevenlabs-client.service';

export type VoiceConversationStatusView = 'PENDING' | 'GRADED';

export interface VoiceConversationStartView {
  signedUrl: string;
  conversationRecordId: string;
  dynamicVariables: {
    fluen_conversation_id: string;
    fluen_user_id: string;
  };
}

export interface VoiceConversationStatusResult {
  status: VoiceConversationStatusView;
  passed: boolean | null;
  xpAwarded: number;
  durationSecs: number | null;
}

interface WebhookTurn {
  role?: string;
  message?: string;
  [k: string]: unknown;
}
interface WebhookPayload {
  data?: {
    conversation_id?: string;
    transcript?: WebhookTurn[];
    metadata?: {
      call_duration_secs?: number;
      cost?: number;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>;
    };
  };
}

// Respons GET /v1/convai/conversations/:id — field di top-level (berbeda dari
// webhook yang dibungkus `data`). Hanya field yang gradeFromWebhook butuh.
interface ConversationDetail {
  status?: string;
  conversation_id?: string;
  transcript?: WebhookTurn[];
  metadata?: {
    call_duration_secs?: number;
    cost?: number;
  };
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, string>;
  };
}

@Injectable()
export class VoiceConversationService {
  private logger = new Logger('VoiceConversation');
  // Cooldown reconcile per row (in-memory, single instance): poll tiap ±2 dtk
  // tidak boleh memukul ElevenLabs tiap kali selama row masih PENDING.
  private static readonly RECONCILE_COOLDOWN_MS = 10_000;
  private lastReconcileAt = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private config: AppConfigService,
    @Inject(ELEVENLABS_CLIENT) private elevenlabs: ElevenLabsClient,
  ) {}

  /**
   * Siapkan percakapan: gate consent + cap harian/mingguan (kontrol biaya),
   * mint signed URL (browser connect langsung ke ElevenLabs, BE tidak di
   * jalur panggilan), catat row PENDING sebagai kunci lookup webhook.
   */
  async start(userId: string): Promise<VoiceConversationStartView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Consent UU PDP — gate sama dengan speak (answer.service): rekaman suara
    // dua arah = data pribadi yang sama sensitifnya. Sudah wajib diisi saat
    // onboarding, tidak perlu layar consent terpisah.
    if (!user?.voiceConsentAt) {
      throw new ForbiddenException('Konsen rekaman suara belum diberikan');
    }

    const [enabled, dailyCap, weeklyCap] = await Promise.all([
      this.config.getInt('VOICE_AGENT_ENABLED'),
      this.config.getInt('VOICE_DAILY_CAP'),
      this.config.getInt('VOICE_WEEKLY_CAP'),
    ]);
    // Feature flag — soft-launch tanpa deploy. Config di-cache 60 dtk oleh
    // AppConfigService, jadi toggle tidak instan (≤1 mnt) — cukup untuk
    // nyala/mati rollout. Gate di BE, bukan sekadar menyembunyikan kartu web.
    if (enabled !== 1) {
      throw new NotFoundException('Fitur Ngobrol dengan AI belum aktif');
    }
    // Hitung SEMUA row (PENDING + GRADED) — panggilan yang sedang berjalan pun
    // (webhook belum datang) memakai slot. Ini mencegah worst-case spend, bukan
    // sekadar XP-farming: sekali call berjalan, BE tidak bisa memotongnya.
    const [todayCount, weekCount] = await Promise.all([
      this.prisma.voiceConversation.count({
        where: { userId, createdAt: { gte: todayWIB() } },
      }),
      this.prisma.voiceConversation.count({
        where: { userId, createdAt: { gte: weekStartWIB(new Date()) } },
      }),
    ]);
    if (todayCount >= dailyCap) {
      throw new HttpException(
        'Batas ngobrol harian sudah tercapai',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (weekCount >= weeklyCap) {
      throw new HttpException(
        'Batas ngobrol mingguan sudah tercapai',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!agentId) {
      throw new InternalServerErrorException('ELEVENLABS_AGENT_ID belum diset');
    }
    const signedUrl = await this.elevenlabs.getSignedUrl(agentId);

    const record = await this.prisma.voiceConversation.create({
      data: { userId },
    });
    return {
      signedUrl,
      conversationRecordId: record.id,
      dynamicVariables: {
        fluen_conversation_id: record.id,
        fluen_user_id: userId,
      },
    };
  }

  /** Status percakapan untuk polling client. Transcript tidak dikirim. */
  async status(userId: string, id: string): Promise<VoiceConversationStatusResult> {
    const row = await this.prisma.voiceConversation.findUnique({ where: { id } });
    if (!row || row.userId !== userId) throw new NotFoundException();
    // Fallback reconcile (jaring pengaman bila webhook tak sampai): id
    // percakapan ElevenLabs sudah ter-register browser saat connect → tarik
    // detail dari ElevenLabs → grade dengan logika IDENTIK gradeFromWebhook.
    let current = row;
    if (row.status === 'PENDING' && row.elevenlabsConversationId) {
      await this.reconcile(row);
      // gradeFromWebhook update via updateMany → objek row di atas basi.
      current =
        (await this.prisma.voiceConversation.findUnique({ where: { id } })) ?? row;
    }
    return {
      status: current.status,
      passed: current.passed,
      xpAwarded: current.xpAwarded,
      durationSecs: current.durationSecs,
    };
  }

  /**
   * Register id percakapan ElevenLabs ke row kita — browser panggil sekali
   * setelah connect (onConnect SDK), supaya reconcile di atas punya kunci
   * lookup saat webhook tidak datang. Ownership-check sama seperti status.
   */
  async registerElevenlabsId(
    userId: string,
    id: string,
    elevenlabsConversationId: string,
  ): Promise<void> {
    const row = await this.prisma.voiceConversation.findUnique({ where: { id } });
    if (!row || row.userId !== userId) throw new NotFoundException();
    if (
      row.elevenlabsConversationId &&
      row.elevenlabsConversationId !== elevenlabsConversationId
    ) {
      throw new ConflictException('Id ElevenLabs sudah terpasang untuk percakapan ini');
    }
    try {
      await this.prisma.voiceConversation.update({
        where: { id },
        data: { elevenlabsConversationId },
      });
    } catch (err) {
      // Unique @unique — id ini sudah dipakai row lain (jarang; onConnect
      // per percakapan). Biarkan caller tahu via 409, bukan 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Id ElevenLabs sudah terpakai percakapan lain');
      }
      throw err;
    }
  }

  /** Tarik data grading dari ElevenLabs bila percakapan sudah selesai (done). */
  private async reconcile(row: {
    id: string;
    elevenlabsConversationId: string | null;
  }): Promise<void> {
    const now = Date.now();
    const last = this.lastReconcileAt.get(row.id) ?? 0;
    if (now - last < VoiceConversationService.RECONCILE_COOLDOWN_MS) return;
    this.lastReconcileAt.set(row.id, now);
    try {
      const detail = (await this.elevenlabs.getConversation(
        row.elevenlabsConversationId as string,
      )) as ConversationDetail | null;
      // null (404) / belum terminal → biarkan PENDING, poll berikutnya retry.
      if (!detail || detail.status !== 'done') return;
      // Susun ulang bentuk respons detail (top-level) jadi payload webhook
      // (wrapper data) → gradeFromWebhook idempoten, logika grading SAMA.
      await this.gradeFromWebhook({
        data: {
          conversation_id: detail.conversation_id,
          transcript: detail.transcript,
          metadata: detail.metadata,
          conversation_initiation_client_data:
            detail.conversation_initiation_client_data,
        },
      });
    } catch (err) {
      // Gagal tarik (jaringan/auth ElevenLabs) → jangan bunuh polling, coba lagi.
      this.logger.warn(
        `reconcile gagal untuk ${row.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Dipanggil webhook receiver SETELAH signature valid. Grading MVP murah
   * (tanpa LLM): lolos bila durasi + jumlah giliran user cukup. Idempoten —
   * updateMany dengan WHERE status='PENDING' membuat retry webhook jadi no-op.
   * Tidak pernah throw untuk payload "valid tapi bukan milik kita" (row tak
   * dikenal / user mismatch) supaya ElevenLabs tidak retry-storm — selalu ack.
   */
  async gradeFromWebhook(payload: unknown): Promise<void> {
    const data = (payload as WebhookPayload)?.data;
    const dv = data?.conversation_initiation_client_data?.dynamic_variables;
    const rowId = dv?.fluen_conversation_id;
    if (!rowId) {
      this.logger.warn('webhook tanpa fluen_conversation_id — diabaikan');
      return;
    }
    const row = await this.prisma.voiceConversation.findUnique({
      where: { id: rowId },
    });
    if (!row) {
      this.logger.warn(`webhook untuk row tak dikenal: ${rowId}`);
      return;
    }
    const userId = dv?.fluen_user_id;
    if (userId && row.userId !== userId) {
      this.logger.warn(`webhook user mismatch untuk ${rowId} — tidak diberi XP`);
      return;
    }

    const transcript = data?.transcript ?? null;
    const durationSecs =
      typeof data?.metadata?.call_duration_secs === 'number'
        ? data.metadata.call_duration_secs
        : null;
    const costCredits =
      typeof data?.metadata?.cost === 'number' ? Math.round(data.metadata.cost) : null;
    const userTurnCount = Array.isArray(transcript)
      ? transcript.filter((t) => t?.role === 'user').length
      : 0;

    const [minDuration, minTurns, xpVoice] = await Promise.all([
      this.config.getInt('VOICE_MIN_DURATION_SECS'),
      this.config.getInt('VOICE_MIN_USER_TURNS'),
      this.config.getInt('XP_VOICE_CONVERSATION'),
    ]);
    const passed =
      durationSecs !== null && durationSecs >= minDuration && userTurnCount >= minTurns;
    const xpAwarded = passed ? xpVoice : 0;

    const { count } = await this.prisma.voiceConversation.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: {
        status: 'GRADED',
        elevenlabsConversationId:
          typeof data?.conversation_id === 'string' ? data.conversation_id : null,
        durationSecs,
        userTurnCount,
        costCredits,
        // null → JsonNull (JSON null di kolom nullable), bukan undefined:
        // updateMany butuh nilai eksplisit, tak bisa omit key dalam objek data.
        transcript:
          transcript === null ? Prisma.JsonNull : (transcript as Prisma.InputJsonValue),
        passed,
        xpAwarded,
        gradedAt: new Date(),
      },
    });
    if (count === 0) {
      this.logger.log(`webhook retry diabaikan untuk ${row.id}`);
    }
  }
}
