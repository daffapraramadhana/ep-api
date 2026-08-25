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
