// apps/api/src/tts/audio-encode.ts
import { readFileSync } from 'fs';

/** PCM mono float [-1, 1] — keluaran engine TTS. */
export type PcmAudio = { samples: Float32Array; sampleRate: number };

type Lame = {
  Mp3Encoder: new (
    channels: number,
    sampleRate: number,
    kbps: number,
  ) => { encodeBuffer(left: Int16Array): Int8Array; flush(): Int8Array };
};

let lame: Lame | null = null;

/**
 * @breezystack/lamejs: build CJS-nya adalah IIFE `var lamejs=…` tanpa
 * module.exports, dan build ESM-nya tak bisa di-require dari CJS/jest
 * (lamejs@1.2.1 asli crash "MPEGMode is not defined"). Evaluasi IIFE sekali.
 */
function lameLib(): Lame {
  lame ??= new Function(
    `${readFileSync(require.resolve('@breezystack/lamejs'), 'utf8')}\nreturn lamejs;`,
  )() as Lame;
  return lame;
}

export function joinSegments(parts: PcmAudio[], gapMs = 350): PcmAudio {
  if (!parts.length) throw new Error('Tidak ada segmen audio');
  const sampleRate = parts[0].sampleRate;
  if (parts.some((p) => p.sampleRate !== sampleRate))
    throw new Error('Sample rate segmen berbeda');
  if (parts.length === 1) return parts[0];
  const gap = Math.round((sampleRate * gapMs) / 1000);
  const total =
    parts.reduce((n, p) => n + p.samples.length, 0) + gap * (parts.length - 1);
  const samples = new Float32Array(total); // nol = jeda senyap
  let at = 0;
  parts.forEach((p, i) => {
    samples.set(p.samples, at);
    at += p.samples.length + (i < parts.length - 1 ? gap : 0);
  });
  return { samples, sampleRate };
}

export function encodeMp3(
  audio: PcmAudio,
  kbps = 64,
): { buf: Buffer; durationMs: number } {
  const pcm = new Int16Array(audio.samples.length);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, audio.samples[i]));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const enc = new (lameLib().Mp3Encoder)(1, audio.sampleRate, kbps);
  const chunks: Buffer[] = [];
  const FRAME = 1152;
  for (let i = 0; i < pcm.length; i += FRAME) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + FRAME));
    if (out.length)
      chunks.push(Buffer.from(out.buffer, out.byteOffset, out.length));
  }
  const tail = enc.flush();
  if (tail.length)
    chunks.push(Buffer.from(tail.buffer, tail.byteOffset, tail.length));
  return {
    buf: Buffer.concat(chunks),
    durationMs: Math.round((audio.samples.length / audio.sampleRate) * 1000),
  };
}
