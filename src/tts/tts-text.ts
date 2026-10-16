// apps/api/src/tts/tts-text.ts
import { createHash } from 'crypto';

/**
 * Fungsi murni untuk teks TTS (spec audio-tts §4–§6): normalisasi, skrip
 * dialog, dan id klip content-addressed. Mengubah ENGINE_ID atau suara
 * mengubah semua id → audio dibuat ulang secara lazy.
 */

export const ENGINE_ID = 'kokoro-82m-v1.0-q8';
export const VOICE_NARRATOR = 'af_heart';
export const VOICE_LEFT = 'af_heart';
export const VOICE_RIGHT = 'am_michael';
export const TTS_MAX_CHARS = 600;

export type TtsSegment = { voice: string; text: string };

// "Nama (peran): kalimat" — lebih ketat dari DIALOG_RE chapter-parser karena di
// sini dialog dideteksi implisit: nama tanpa angka (jam "9:30", rasio "1:2"
// bukan pembicara), wajib spasi setelah titik dua, maks 4 kata / 40 karakter.
const DIALOG_RE = /^([^\d:()]{1,40}?)\s*(?:\(([^)]*)\))?\s*:\s+(.+)$/;
const MAX_SPEAKER_WORDS = 4;

function speakerLine(line: string): RegExpExecArray | null {
  const m = DIALOG_RE.exec(line);
  return m && m[1].trim().split(/\s+/).length <= MAX_SPEAKER_WORDS ? m : null;
}

/** Batas aman per panggilan engine: Kokoro memotong diam-diam >512 token fonem (±500 char). */
export const TTS_CHUNK_CHARS = 300;

export function speakableText(s: string): string {
  const t = s
    .replace(/\*\*|\*|`/g, '')
    .replace(/…/g, '...')
    .replace(/\s+\/\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  return /[\p{L}\p{N}]/u.test(t) ? t : '';
}

/** Sapaan menentukan suara: Mr./Sir → laki-laki, Mrs./Ms./Miss/Madam → perempuan. */
function voiceFromTitle(speaker: string): string | null {
  if (/^(mr|sir)\b/.test(speaker)) return VOICE_RIGHT;
  if (/^(mrs|ms|miss|madam)\b/.test(speaker)) return VOICE_LEFT;
  return null;
}

/**
 * Pembicara bersapaan dapat suara sesuai gendernya (bila belum dipakai);
 * sisanya mengisi suara yang tersisa sesuai urutan — dua pembicara selalu
 * terdengar berbeda.
 */
export function assignVoices(speakers: string[]): Map<string, string> {
  const voices = new Map<string, string>();
  const used = () => new Set(voices.values());
  for (const s of speakers) {
    const v = voiceFromTitle(s);
    if (v && !used().has(v)) voices.set(s, v);
  }
  for (const s of speakers)
    if (!voices.has(s))
      voices.set(
        s,
        [VOICE_LEFT, VOICE_RIGHT].find((v) => !used().has(v))!,
      );
  return voices;
}

export function parseTtsScript(
  text: string,
): { segments: TtsSegment[] } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const matches = lines.map(speakerLine);
  // Satu baris "Catatan: ..." tetap narasi — dialog butuh ≥2 baris.
  if (lines.length >= 2 && matches.every(Boolean)) {
    const turns = (matches as RegExpExecArray[]).map((m) => ({
      speaker: m[1].trim(),
      text: speakableText(m[3]),
    }));
    const speakers = [...new Set(turns.map((t) => t.speaker.toLowerCase()))];
    if (speakers.length > 2)
      return { error: 'Teks audio maksimal 2 pembicara' };
    const voices = assignVoices(speakers);
    return {
      segments: turns
        .filter((t) => t.text)
        .map((t) => ({
          voice: voices.get(t.speaker.toLowerCase())!,
          text: t.text,
        })),
    };
  }
  const spoken = speakableText(lines.join(' '));
  return { segments: spoken ? [{ voice: VOICE_NARRATOR, text: spoken }] : [] };
}

/** Kemas potongan berurutan menjadi kelompok ≤ max karakter (digabung spasi). */
function pack(pieces: string[], max: number): string[] {
  const out: string[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + p.length <= max)
      out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out;
}

/**
 * Pecah teks untuk engine: per kalimat, lalu per koma, lalu per kata — tiap
 * potong ≤ max, tanpa kata hilang (join(' ') = teks asal ber-spasi tunggal).
 */
export function chunkText(text: string, max = TTS_CHUNK_CHARS): string[] {
  if (text.length <= max) return [text];
  const split = (t: string, level: number): string[] => {
    if (t.length <= max) return [t];
    const re = [/(?<=[.!?])\s+/, /(?<=[,;])\s+/, /\s+/][level];
    if (!re) return [t]; // satu "kata" > max: tak bisa dipecah lebih jauh
    const parts = t.split(re).filter(Boolean);
    if (parts.length === 1) return split(t, level + 1);
    return pack(
      parts.flatMap((p) => split(p, level + 1)),
      max,
    );
  };
  return split(text, 0);
}

export function clipId(segments: TtsSegment[]): string {
  return createHash('sha256')
    .update(ENGINE_ID + JSON.stringify(segments))
    .digest('hex')
    .slice(0, 32);
}
