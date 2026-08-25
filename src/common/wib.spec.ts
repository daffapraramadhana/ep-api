import { dateWIB, addDays, weekStartWIB } from './wib';

describe('wib', () => {
  it('22:00 UTC = 05:00 WIB hari berikutnya', () => {
    expect(dateWIB(new Date('2026-03-10T22:00:00Z')).toISOString()).toBe('2026-03-11T00:00:00.000Z');
  });
  it('06:00 UTC = 13:00 WIB hari sama', () => {
    expect(dateWIB(new Date('2026-03-10T06:00:00Z')).toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });
  it('weekStart Senin', () => {
    expect(weekStartWIB(new Date('2026-03-11T06:00:00Z')).toISOString()).toBe('2026-03-09T00:00:00.000Z');
  });
  it('addDays', () => {
    expect(addDays(new Date('2026-03-10T00:00:00Z'), 3).toISOString()).toBe('2026-03-13T00:00:00.000Z');
  });
});
