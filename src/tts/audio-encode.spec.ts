import { encodeMp3, joinSegments, PcmAudio } from './audio-encode';

const pcm = (n: number, sampleRate = 24000): PcmAudio => ({
  samples: new Float32Array(n).fill(0.1),
  sampleRate,
});

describe('joinSegments', () => {
  it('menyisipkan jeda senyap 350 ms di antara segmen saja', () => {
    const out = joinSegments([pcm(100), pcm(50)], 350);
    expect(out.samples.length).toBe(100 + 8400 + 50);
    expect(out.sampleRate).toBe(24000);
    expect(out.samples[100]).toBe(0);
    expect(out.samples[0]).toBeCloseTo(0.1);
    expect(out.samples[100 + 8400]).toBeCloseTo(0.1);
  });

  it('satu segmen dikembalikan tanpa jeda', () => {
    expect(joinSegments([pcm(100)]).samples.length).toBe(100);
  });

  it('sample rate berbeda → error', () => {
    expect(() => joinSegments([pcm(10, 24000), pcm(10, 22050)])).toThrow();
  });
});

describe('encodeMp3', () => {
  it('menghasilkan frame MP3 dan durasi yang benar', () => {
    const samples = new Float32Array(24000);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i / 10) * 0.5;
    const { buf, durationMs } = encodeMp3({ samples, sampleRate: 24000 });
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0xff);
    expect(buf[1] & 0xe0).toBe(0xe0);
    expect(Math.abs(durationMs - 1000)).toBeLessThanOrEqual(50);
  });

  it('sampel di luar [-1, 1] di-clamp, tidak melempar', () => {
    const samples = new Float32Array(2400).fill(3);
    expect(encodeMp3({ samples, sampleRate: 24000 }).buf.length).toBeGreaterThan(0);
  });
});
