import { IdleUnloader } from './idle-unloader';

const MIN = 60_000;

describe('IdleUnloader', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function settle() {
    // biarkan promise run() & pembacaan idleMs async selesai
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }

  it('melepas tepat 10 menit setelah tugas terakhir selesai', async () => {
    const onIdle = jest.fn();
    const u = new IdleUnloader(() => 10 * MIN, onIdle);
    await u.run(async () => 'ok');
    await settle();
    jest.advanceTimersByTime(10 * MIN - 1);
    expect(onIdle).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('tidak melepas selama tugas panjang masih berjalan', async () => {
    const onIdle = jest.fn();
    const u = new IdleUnloader(async () => 10 * MIN, onIdle);
    await u.run(async () => 'warm');
    await settle();
    let finish!: () => void;
    const slow = u.run(() => new Promise<void>((r) => (finish = r)));
    jest.advanceTimersByTime(15 * MIN);
    expect(onIdle).not.toHaveBeenCalled();
    finish();
    await slow;
    await settle();
    jest.advanceTimersByTime(10 * MIN - 1);
    expect(onIdle).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('dua tugas tumpang tindih → timer mulai setelah yang terakhir', async () => {
    const onIdle = jest.fn();
    const u = new IdleUnloader(() => 10 * MIN, onIdle);
    let a!: () => void;
    let b!: () => void;
    const pa = u.run(() => new Promise<void>((r) => (a = r)));
    const pb = u.run(() => new Promise<void>((r) => (b = r)));
    a();
    await pa;
    await settle();
    jest.advanceTimersByTime(20 * MIN);
    expect(onIdle).not.toHaveBeenCalled();
    b();
    await pb;
    await settle();
    jest.advanceTimersByTime(10 * MIN);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('tugas yang gagal tetap menjadwalkan pelepasan', async () => {
    const onIdle = jest.fn();
    const u = new IdleUnloader(() => 10 * MIN, onIdle);
    await expect(
      u.run(async () => Promise.reject(new Error('x'))),
    ).rejects.toThrow('x');
    await settle();
    jest.advanceTimersByTime(10 * MIN);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('idleMs gagal dibaca (DB/config) → tidak crash, pakai default 10 menit', async () => {
    const onIdle = jest.fn();
    const u = new IdleUnloader(
      () => Promise.reject(new Error('db down')),
      onIdle,
    );
    await u.run(async () => 'ok');
    await settle();
    jest.advanceTimersByTime(10 * MIN - 1);
    expect(onIdle).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('idleMs bukan angka valid (NaN/≤0) → default 10 menit, bukan langsung', async () => {
    for (const bad of [NaN, 0, -5]) {
      const onIdle = jest.fn();
      const u = new IdleUnloader(() => bad, onIdle);
      await u.run(async () => 'ok');
      await settle();
      jest.advanceTimersByTime(10 * MIN - 1);
      expect(onIdle).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(onIdle).toHaveBeenCalledTimes(1);
    }
  });
});
