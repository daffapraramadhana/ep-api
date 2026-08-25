import { metDays, computeStatus, computeTrend } from './metrics';

describe('metDays', () => {
  it('menghitung hari yang mencapai target (>= target)', () => {
    const days = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
    const perDay = new Map([
      ['d1', 1], ['d2', 1], ['d3', 1], ['d4', 1], ['d5', 1],
      ['d6', 0], ['d7', 0],
    ]);
    expect(metDays(perDay, 1, days)).toBe(5);
  });

  it('target minimal 1 walau target 0 dikirim', () => {
    const days = ['d1', 'd2'];
    const perDay = new Map([['d1', 0], ['d2', 1]]);
    expect(metDays(perDay, 0, days)).toBe(1);
  });

  it('hari tanpa entri di map dianggap 0', () => {
    const days = ['d1', 'd2'];
    const perDay = new Map<string, number>();
    expect(metDays(perDay, 1, days)).toBe(0);
  });
});

describe('computeStatus', () => {
  const base = {
    onboarded: true,
    lastCompletedDate: '2026-08-20',
    today: '2026-08-25',
    inactiveThresholdDays: 5,
    metDaysLast7: 3,
    activeLast7: true,
  };

  it('!onboarded -> belum_mulai (cabang tertinggi, prioritas di atas semua)', () => {
    expect(
      computeStatus({ ...base, onboarded: false, lastCompletedDate: null }),
    ).toBe('belum_mulai');
  });

  it('lastCompletedDate null (tapi onboarded) -> butuh_perhatian', () => {
    expect(computeStatus({ ...base, lastCompletedDate: null })).toBe(
      'butuh_perhatian',
    );
  });

  it('selisih hari TEPAT threshold (5) -> butuh_perhatian', () => {
    // today 2026-08-25, lastCompletedDate 2026-08-20 -> selisih 5 hari.
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-20' }),
    ).toBe('butuh_perhatian');
  });

  it('selisih hari threshold-1 (4) -> BUKAN butuh_perhatian', () => {
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-21' }),
    ).not.toBe('butuh_perhatian');
  });

  it('metDaysLast7 >= 5 -> on_track', () => {
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-21', metDaysLast7: 5 }),
    ).toBe('on_track');
  });

  it('metDaysLast7 5/7 -> on_track vs 4/7 -> aktif', () => {
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-21', metDaysLast7: 5 }),
    ).toBe('on_track');
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-21', metDaysLast7: 4 }),
    ).toBe('aktif');
  });

  it('metDaysLast7 < 5 & tidak butuh_perhatian -> aktif', () => {
    expect(
      computeStatus({ ...base, lastCompletedDate: '2026-08-24', metDaysLast7: 0 }),
    ).toBe('aktif');
  });
});

describe('computeTrend', () => {
  it('delta tepat +5.0pp -> up', () => {
    // recent 15/20 = 75%; prior 14/20 = 70%; delta = +5.0
    expect(
      computeTrend({ correct: 15, total: 20 }, { correct: 14, total: 20 }),
    ).toBe('up');
  });

  it('delta +4.9pp -> flat (tidak cukup untuk up)', () => {
    // recent 100/1000 -> nope, use denom 1000 for precision: recent 549/1000=54.9%
    // prior 500/1000=50.0% -> delta = 4.9
    expect(
      computeTrend({ correct: 549, total: 1000 }, { correct: 500, total: 1000 }),
    ).toBe('flat');
  });

  it('delta tepat -5.0pp -> down', () => {
    // recent 14/20=70%; prior 15/20=75%; delta = -5.0
    expect(
      computeTrend({ correct: 14, total: 20 }, { correct: 15, total: 20 }),
    ).toBe('down');
  });

  it('jendela recent hanya 9 attempt -> null (butuh >= 10)', () => {
    expect(
      computeTrend({ correct: 9, total: 9 }, { correct: 15, total: 20 }),
    ).toBeNull();
  });

  it('prior 0 total -> null', () => {
    expect(
      computeTrend({ correct: 15, total: 20 }, { correct: 0, total: 0 }),
    ).toBeNull();
  });
});
