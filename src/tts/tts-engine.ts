// apps/api/src/tts/tts-engine.ts
import { Injectable } from '@nestjs/common';
import type { KokoroTTS } from 'kokoro-js';
import type { PcmAudio } from './audio-encode';
import type { TtsSegment } from './tts-text';

/**
 * Mesin TTS di balik token DI (pola ELEVENLABS_CLIENT / STT_TRANSCRIBER) —
 * ganti provider tanpa mengubah pemanggil; test memakai engine palsu.
 */
export const TTS_ENGINE = Symbol('TTS_ENGINE');

export interface TtsEngine {
  synthesize(seg: TtsSegment): Promise<PcmAudio>;
  unload(): Promise<void>;
}

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
type KokoroVoice = NonNullable<
  NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice']
>;

/**
 * Kokoro-82M (q8, CPU) lewat kokoro-js. Model dimuat lazy pada sintesis
 * pertama (satu promise bersama untuk panggilan paralel) dan bisa dilepas
 * lewat unload(). TTS_MODEL_DIR = cache model yang dipanggang ke image.
 */
@Injectable()
export class KokoroEngine implements TtsEngine {
  private model: Promise<KokoroTTS> | null = null;

  private load(): Promise<KokoroTTS> {
    this.model ??= (async () => {
      if (process.env.TTS_MODEL_DIR) {
        const { env } = await import('@huggingface/transformers');
        env.cacheDir = process.env.TTS_MODEL_DIR;
      }
      const { KokoroTTS } = await import('kokoro-js');
      return KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' });
    })().catch((e) => {
      this.model = null;
      throw e;
    });
    return this.model;
  }

  async synthesize(seg: TtsSegment): Promise<PcmAudio> {
    const tts = await this.load();
    const audio = await tts.generate(seg.text, {
      voice: seg.voice as KokoroVoice,
    });
    return { samples: audio.audio, sampleRate: audio.sampling_rate };
  }

  async unload(): Promise<void> {
    const pending = this.model;
    this.model = null;
    if (!pending) return;
    const tts = await pending.catch(() => null);
    await (
      tts?.model as { dispose?: () => Promise<unknown> } | undefined
    )?.dispose?.();
  }
}
