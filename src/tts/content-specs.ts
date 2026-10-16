// apps/api/src/tts/content-specs.ts
import type { StoredBlock } from '../modules/chapter-parser';
import {
  assignVoices,
  parseTtsScript,
  speakableText,
  VOICE_NARRATOR,
} from './tts-text';
import type { TtsSpec } from './tts.service';

/**
 * Satu-satunya tempat yang memutuskan teks apa dapat audio (spec audio-tts §5).
 * Dipakai tampilan sesi/bab dan CLI backfill → id klip selalu konsisten.
 */

type AudioItem = {
  type: string;
  answerKey: string;
  ttsText: string | null;
  mediaFile: string | null;
};

function script(text: string): TtsSpec | null {
  const r = parseTtsScript(text);
  return 'segments' in r && r.segments.length ? r : null;
}

export function itemSpecs(item: AudioItem): {
  target: TtsSpec | null;
  media: TtsSpec | null;
} {
  return {
    target:
      item.type === 'UCAPAN' ? script(item.ttsText ?? item.answerKey) : null,
    // UCAPAN: ttsText hanya mengubah bacaan contoh — bukan audio soal yang autoplay.
    media:
      item.type !== 'UCAPAN' && item.ttsText && !item.mediaFile
        ? script(item.ttsText)
        : null,
  };
}

function one(voice: string, text: string): TtsSpec {
  const spoken = speakableText(text);
  return { segments: spoken ? [{ voice, text: spoken }] : [] };
}

export function chapterSpecs(blocks: StoredBlock[]): TtsSpec[] {
  const specs: TtsSpec[] = [];
  for (const b of blocks) {
    if (b.type === 'phrases')
      for (const p of b.items) specs.push(one(VOICE_NARRATOR, p.en));
    if (b.type === 'dialog') {
      // sama dengan ttsText: sapaan (Mr./Mrs./…) menentukan suara, bukan sisi
      const voices = assignVoices([
        ...new Set(b.lines.map((l) => l.speaker.trim().toLowerCase())),
      ]);
      for (const l of b.lines)
        specs.push(one(voices.get(l.speaker.trim().toLowerCase())!, l.text));
    }
  }
  return specs;
}
