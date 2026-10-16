import {
  dateWIB,
  addDays,
  weekStartWIB,
  wibMidnightInstant,
  startOfDayWIBInstant,
  startOfWeekWIBInstant,
} from './wib';

describe('wib', () => {
  it('22:00 UTC = 05:00 WIB hari berikutnya', () => {
    expect(dateWIB(new Date('2026-03-10T22:00:00Z')).toISOString()).toBe(
      '2026-03-11T00:00:00.000Z',
    );
  });
  it('06:00 UTC = 13:00 WIB hari sama', () => {
    expect(dateWIB(new Date('2026-03-10T06:00:00Z')).toISOString()).toBe(
      '2026-03-10T00:00:00.000Z',
    );
  });
  it('weekStart Senin', () => {
    expect(weekStartWIB(new Date('2026-03-11T06:00:00Z')).toISOString()).toBe(
      '2026-03-09T00:00:00.000Z',
    );
  });
  it('addDays', () => {
    expect(addDays(new Date('2026-03-10T00:00:00Z'), 3).toISOString()).toBe(
      '2026-03-13T00:00:00.000Z',
    );
  });

  // Penanda tanggal (dateWIB/todayWIB) = 00:00 UTC = 07:00 WIB — salah bila
  // dibandingkan dgn kolom timestamp. Helper *Instant = momen nyata 00:00 WIB.
  it('wibMidnightInstant: penanda 17 Okt → 16 Okt 17:00 UTC (= 17 Okt 00:00 WIB)', () => {
    expect(
      wibMidnightInstant(new Date('2026-10-17T00:00:00Z')).toISOString(),
    ).toBe('2026-10-16T17:00:00.000Z');
  });
  it('startOfDayWIBInstant 00:30 WIB → 00:00 WIB hari sama', () => {
    // 2026-10-17 00:30 WIB = 2026-10-16T17:30Z
    expect(
      startOfDayWIBInstant(new Date('2026-10-16T17:30:00Z')).toISOString(),
    ).toBe('2026-10-16T17:00:00.000Z');
  });
  it('startOfDayWIBInstant tepat 00:00 WIB → dirinya sendiri', () => {
    expect(
      startOfDayWIBInstant(new Date('2026-10-16T17:00:00Z')).toISOString(),
    ).toBe('2026-10-16T17:00:00.000Z');
  });
  it('startOfDayWIBInstant 23:59 WIB → 00:00 WIB hari sama', () => {
    // 2026-10-17 23:59 WIB = 2026-10-17T16:59Z
    expect(
      startOfDayWIBInstant(new Date('2026-10-17T16:59:00Z')).toISOString(),
    ).toBe('2026-10-16T17:00:00.000Z');
  });
  it('startOfWeekWIBInstant Senin 00:30 WIB → Senin 00:00 WIB', () => {
    // Senin 2026-10-12 00:30 WIB = 2026-10-11T17:30Z
    expect(
      startOfWeekWIBInstant(new Date('2026-10-11T17:30:00Z')).toISOString(),
    ).toBe('2026-10-11T17:00:00.000Z');
  });
  it('startOfWeekWIBInstant Minggu 23:59 WIB → Senin 00:00 WIB minggu itu', () => {
    // Minggu 2026-10-18 23:59 WIB = 2026-10-18T16:59Z
    expect(
      startOfWeekWIBInstant(new Date('2026-10-18T16:59:00Z')).toISOString(),
    ).toBe('2026-10-11T17:00:00.000Z');
  });
});
