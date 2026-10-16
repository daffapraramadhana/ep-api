// apps/api/src/tts/idle-unloader.ts

/**
 * Lepas model TTS setelah N ms tanpa sintesis (spec audio-tts §7). Selama ada
 * tugas `run` yang berjalan, tidak pernah melepas; timer dihitung dari
 * selesainya tugas terakhir. Timer di-unref supaya tidak menahan proses.
 */
const DEFAULT_IDLE_MS = 10 * 60_000;

export class IdleUnloader {
  private active = 0;
  private timer: NodeJS.Timeout | null = null;
  private generation = 0;

  constructor(
    private readonly idleMs: () => Promise<number> | number,
    private readonly onIdle: () => Promise<void> | void,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;
    this.cancel();
    try {
      return await fn();
    } finally {
      this.active--;
      // schedule() tak pernah boleh menolak: rejection tak tertangani = proses mati.
      if (this.active === 0) void this.schedule().catch(() => undefined);
    }
  }

  private cancel() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async schedule() {
    const gen = ++this.generation;
    let ms: number;
    try {
      ms = await this.idleMs();
    } catch {
      ms = DEFAULT_IDLE_MS; // config/DB gagal dibaca → tetap lepas model nanti
    }
    if (!Number.isFinite(ms) || ms <= 0) ms = DEFAULT_IDLE_MS;
    if (gen !== this.generation || this.active > 0) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.active > 0) return;
      try {
        void Promise.resolve(this.onIdle()).catch(() => undefined);
      } catch {
        // pelepasan gagal = model tetap termuat; dicoba lagi pada idle berikutnya
      }
    }, ms);
    this.timer.unref?.();
  }
}
