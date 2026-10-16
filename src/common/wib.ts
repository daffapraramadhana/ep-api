// WIB = UTC+7, tanpa DST, aman aritmetika manual
const H7 = 7 * 3600_000;

export function dateWIB(d: Date): Date {
  const t = d.getTime() + H7;
  return new Date(Math.floor(t / 86_400_000) * 86_400_000);
}

export const todayWIB = () => dateWIB(new Date());

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export function weekStartWIB(d: Date): Date {
  const day = dateWIB(d);
  const dow = (day.getUTCDay() + 6) % 7; // Senin=0
  return addDays(day, -dow);
}

// dateWIB/todayWIB/weekStartWIB mengembalikan *penanda tanggal* (00:00 UTC
// dg Y-M-D = hari WIB) — cocok utk kolom @db.Date (Session.date, StreakFreeze),
// tapi SALAH bila dibandingkan dgn kolom timestamp nyata (createdAt,
// answeredAt, ...): batasnya jatuh di 07:00 WIB. Untuk timestamp pakai *Instant.

/** Penanda tanggal WIB → momen nyata 00:00 WIB hari itu. */
export const wibMidnightInstant = (day: Date) => new Date(day.getTime() - H7);

/** Momen nyata 00:00 WIB dari hari WIB yang memuat `d`. */
export const startOfDayWIBInstant = (d: Date) => wibMidnightInstant(dateWIB(d));

/** Momen nyata Senin 00:00 WIB dari minggu WIB yang memuat `d`. */
export const startOfWeekWIBInstant = (d: Date) =>
  wibMidnightInstant(weekStartWIB(d));
