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

// Sama dengan DIALOG_RE di chapter-parser: "Nama (peran): kalimat".
const DIALOG_RE = /^([^:()]+?)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/;

export function speakableText(s: string): string {
  const t = s
    .replace(/\*\*|\*|`/g, '')
    .replace(/…/g, '...')
    .replace(/\s+\/\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  return /[\p{L}\p{N}]/u.test(t) ? t : '';
}

export function parseTtsScript(
  text: string,
): { segments: TtsSegment[] } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const matches = lines.map((l) => DIALOG_RE.exec(l));
  // Satu baris "Catatan: ..." tetap narasi — dialog butuh ≥2 baris.
  if (lines.length >= 2 && matches.every(Boolean)) {
    const voices = new Map<string, string>();
    const segments: TtsSegment[] = [];
    for (const m of matches as RegExpExecArray[]) {
      const speaker = m[1].trim().toLowerCase();
      if (!voices.has(speaker)) {
        if (voices.size >= 2) return { error: 'Teks audio maksimal 2 pembicara' };
        voices.set(speaker, voices.size === 0 ? VOICE_LEFT : VOICE_RIGHT);
      }
      const spoken = speakableText(m[3]);
      if (spoken) segments.push({ voice: voices.get(speaker)!, text: spoken });
    }
    return { segments };
  }
  const spoken = speakableText(lines.join(' '));
  return { segments: spoken ? [{ voice: VOICE_NARRATOR, text: spoken }] : [] };
}

export function clipId(segments: TtsSegment[]): string {
  return createHash('sha256')
    .update(ENGINE_ID + JSON.stringify(segments))
    .digest('hex')
    .slice(0, 32);
}
