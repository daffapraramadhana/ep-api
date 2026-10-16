import type { PcmAudio } from '../src/tts/audio-encode';
import type { TtsEngine } from '../src/tts/tts-engine';
import type { TtsSegment } from '../src/tts/tts-text';

/** Engine TTS palsu untuk e2e — tidak pernah memuat model Kokoro. */
export class FakeTtsEngine implements TtsEngine {
  calls: TtsSegment[] = [];
  /** jumlah sintesis berikutnya yang dibuat gagal */
  failNext = 0;
  delayMs = 0;
  unloads = 0;

  async synthesize(seg: TtsSegment): Promise<PcmAudio> {
    this.calls.push(seg);
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('fake engine gagal');
    }
    const samples = new Float32Array(4800); // 0,2 dtk @ 24 kHz
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i / 8) * 0.3;
    return { samples, sampleRate: 24000 };
  }

  async unload(): Promise<void> {
    this.unloads++;
  }
}
