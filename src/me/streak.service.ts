import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, todayWIB, weekStartWIB } from '../common/wib';
import { StreakEvaluator } from '../session/answer.service';

// Any Prisma client shape with the model delegates evaluate() needs — either
// the app-wide PrismaService or an interactive-transaction client. Accepting
// both lets answer.service.ts pass its `tx` so the just-completed session
// (still uncommitted) is visible to the streak query in the SAME request.
type PrismaLike = Prisma.TransactionClient | PrismaService;

export interface StreakResult {
  streak: number;
  longest: number;
  frozenDates: string[]; // ISO date (yyyy-mm-dd), sorted
}

const MAX_DAYS = 400;
const MILESTONES = [7, 30, 100] as const;

/**
 * Streak + lazy weekly freeze engine.
 *
 * Rules (see task-5 brief):
 * - A WIB day is "met" when count(Session{userId,kind:DAILY,status:COMPLETED,
 *   date:d}) >= user's CURRENT dailyTargetSessions.
 * - Walking backward from today: today may be unmet without breaking the
 *   streak (the day isn't over yet) — it simply doesn't count either way.
 * - An isolated missed day (both neighbors met) can be closed by a freeze:
 *   lazily CREATE a StreakFreeze row for that WIB week if none exists yet
 *   (idempotent via @@id([userId, weekStart])); if one already exists for a
 *   *different* day that week, this gap is NOT covered (only 1 freeze/week).
 * - Two consecutive missed days (raw, ignoring freeze) always break the
 *   streak — neither gets a chance at a freeze.
 * - `longest` replays the same rules across all available history but never
 *   creates a NEW freeze row past the point the current streak already
 *   broke — it only recognizes freezes that genuinely exist.
 */
@Injectable()
export class StreakService implements StreakEvaluator {
  constructor(private prisma: PrismaService) {}

  async evaluate(userId: string, client?: PrismaLike): Promise<StreakResult> {
    return this.compute(client ?? this.prisma, userId, {
      createFreeze: true,
      excludeToday: false,
    });
  }

  async evaluateAfterSession(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{
    streak: number;
    changed: boolean;
    milestone: 7 | 30 | 100 | null;
  }> {
    // withToday is the real evaluation (may lazily consume a freeze) and is
    // what gets returned/persisted. withoutToday is a read-only comparison —
    // "what would the streak be if today didn't count at all" — used only to
    // detect whether THIS completion is what tipped today over the target.
    const withToday = await this.compute(tx, userId, {
      createFreeze: true,
      excludeToday: false,
    });
    const withoutToday = await this.compute(tx, userId, {
      createFreeze: false,
      excludeToday: true,
    });
    const changed = withToday.streak > withoutToday.streak;
    const milestone =
      changed && (MILESTONES as readonly number[]).includes(withToday.streak)
        ? (withToday.streak as 7 | 30 | 100)
        : null;
    return { streak: withToday.streak, changed, milestone };
  }

  private async compute(
    db: PrismaLike,
    userId: string,
    opts: { createFreeze: boolean; excludeToday: boolean },
  ): Promise<StreakResult> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { dailyTargetSessions: true },
    });
    const target = user?.dailyTargetSessions ?? 1;
    const today = todayWIB();
    const windowStart = addDays(today, -MAX_DAYS);

    const sessions = await db.session.findMany({
      where: {
        userId,
        kind: 'DAILY',
        status: 'COMPLETED',
        date: { gte: windowStart },
      },
      select: { date: true },
    });
    const counts = new Map<number, number>();
    for (const s of sessions) {
      const k = s.date.getTime();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const freezes = await db.streakFreeze.findMany({ where: { userId } });
    // weekStart key -> coveredDate key
    const freezeMap = new Map<number, number>();
    for (const f of freezes)
      freezeMap.set(f.weekStart.getTime(), f.coveredDate.getTime());

    if (counts.size === 0 && freezes.length === 0) {
      return { streak: 0, longest: 0, frozenDates: [] };
    }

    let earliest = today.getTime();
    for (const k of counts.keys()) earliest = Math.min(earliest, k);
    for (const f of freezes)
      earliest = Math.min(earliest, f.coveredDate.getTime());
    const earliestBound = Math.max(earliest, windowStart.getTime());

    const met = (d: Date) => (counts.get(d.getTime()) ?? 0) >= target;

    let d = today;
    let run = 0;
    let currentStreak = 0;
    let longest = 0;
    let brokeCurrent = false;
    let prevDayWasRawGap = false;
    let daysWalked = 0;

    while (daysWalked < MAX_DAYS && d.getTime() >= earliestBound) {
      const isToday = d.getTime() === today.getTime();

      if (isToday && opts.excludeToday) {
        // Forced grace for the "without today" comparison, regardless of
        // today's actual met status.
        prevDayWasRawGap = false;
      } else if (met(d)) {
        run += 1;
        prevDayWasRawGap = false;
        if (!brokeCurrent) currentStreak = run;
      } else if (isToday) {
        // Natural grace: today unmet doesn't count, doesn't break, and
        // doesn't chain as a "gap" for tomorrow-... err, yesterday's check.
        prevDayWasRawGap = false;
      } else {
        const olderNeighborUnmet = !met(addDays(d, -1));
        const blocked = prevDayWasRawGap || olderNeighborUnmet;
        if (blocked) {
          longest = Math.max(longest, run);
          run = 0;
          brokeCurrent = true;
          prevDayWasRawGap = true;
        } else {
          const weekKey = weekStartWIB(d).getTime();
          const existingCovered = freezeMap.get(weekKey);
          let covered: boolean;
          if (existingCovered === undefined) {
            if (opts.createFreeze && !brokeCurrent) {
              await this.createFreezeIdempotent(db, userId, weekStartWIB(d), d);
              freezeMap.set(weekKey, d.getTime());
              covered = true;
            } else {
              covered = false;
            }
          } else {
            covered = existingCovered === d.getTime();
          }

          if (covered) {
            run += 1;
            prevDayWasRawGap = true;
            if (!brokeCurrent) currentStreak = run;
          } else {
            longest = Math.max(longest, run);
            run = 0;
            brokeCurrent = true;
            prevDayWasRawGap = true;
          }
        }
      }

      daysWalked += 1;
      d = addDays(d, -1);
    }
    longest = Math.max(longest, run);

    const frozenDates = [...freezeMap.values()]
      .map((t) => new Date(t).toISOString().slice(0, 10))
      .sort();

    return { streak: currentStreak, longest, frozenDates };
  }

  private async createFreezeIdempotent(
    db: PrismaLike,
    userId: string,
    weekStart: Date,
    coveredDate: Date,
  ): Promise<void> {
    try {
      await db.streakFreeze.create({
        data: { userId, weekStart, coveredDate },
      });
    } catch (e) {
      const isUniqueViolation =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (!isUniqueViolation) throw e;
      // Another concurrent evaluate() already created this week's freeze row
      // (or a stale in-memory freezeMap raced a prior call) — idempotent by
      // @@id([userId, weekStart]), so just swallow it.
    }
  }
}
