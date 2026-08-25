export type EmployeeStatus = 'aktif' | 'on_track' | 'butuh_perhatian' | 'belum_mulai';
export interface DayCount { date: string /* YYYY-MM-DD */; count: number }

function daysBetween(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00.000Z`).getTime();
  const t = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((t - f) / 86_400_000);
}

/** hari "tercapai" = completed >= target (target minimal 1) */
export function metDays(
  perDayCompleted: Map<string, number>,
  target: number,
  days: string[],
): number {
  const t = Math.max(target, 1);
  let n = 0;
  for (const d of days) {
    if ((perDayCompleted.get(d) ?? 0) >= t) n++;
  }
  return n;
}

export function computeStatus(args: {
  onboarded: boolean;
  lastCompletedDate: string | null; // YYYY-MM-DD WIB
  today: string;
  inactiveThresholdDays: number;
  metDaysLast7: number;
  activeLast7: boolean; // >=1 completed session in last 7 days
}): EmployeeStatus {
  if (!args.onboarded) return 'belum_mulai';
  if (args.lastCompletedDate === null) return 'butuh_perhatian';
  const diff = daysBetween(args.lastCompletedDate, args.today);
  if (diff >= args.inactiveThresholdDays) return 'butuh_perhatian';
  if (args.metDaysLast7 >= 5) return 'on_track';
  return 'aktif';
}

export function computeTrend(
  recent: { correct: number; total: number },
  prior: { correct: number; total: number },
): 'up' | 'down' | 'flat' | null {
  if (recent.total < 10 || prior.total < 10) return null;
  const raw = (recent.correct / recent.total - prior.correct / prior.total) * 100;
  // Kill floating-point noise (e.g. 5.000000000000004 or 4.999999999999998)
  // so exact-boundary percentages land on the correct side of the cutoff.
  const delta = Math.round(raw * 1e6) / 1e6;
  if (delta >= 5) return 'up';
  if (delta <= -5) return 'down';
  return 'flat';
}
