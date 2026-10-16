// apps/api/src/modules/blocks.ts
import { StorageService } from '../storage/storage.service';
import { chapterSpecs } from '../tts/content-specs';
import type { TtsService } from '../tts/tts.service';
import type { StoredBlock } from './chapter-parser';

type PhrasesBlock = Extract<StoredBlock, { type: 'phrases' }>;
type DialogBlock = Extract<StoredBlock, { type: 'dialog' }>;

/** Bentuk blok yang dikirim ke FE: file media sudah jadi URL publik. */
export type ChapterBlock =
  | Exclude<
      StoredBlock,
      | { type: 'image' }
      | { type: 'audio' }
      | { type: 'phrases' }
      | { type: 'dialog' }
    >
  | { type: 'image'; url: string; alt: string }
  | { type: 'audio'; url: string }
  | {
      type: 'phrases';
      items: (PhrasesBlock['items'][number] & { audioUrl?: string | null })[];
    }
  | {
      type: 'dialog';
      lines: (DialogBlock['lines'][number] & { audioUrl?: string | null })[];
    };

export function resolveBlocks(
  blocks: StoredBlock[],
  storage: StorageService,
): ChapterBlock[] {
  return blocks.map((b) => {
    if (b.type === 'image')
      return { type: 'image', url: storage.getUrl(b.file), alt: b.alt };
    if (b.type === 'audio')
      return { type: 'audio', url: storage.getUrl(b.file) };
    return b;
  });
}

/**
 * Isi audioUrl tiap frasa & baris dialog (spec audio-tts §5). Hanya untuk bab
 * TERSIMPAN — pratinjau admin tidak memanggil ini supaya ketikan tidak
 * menumpuk baris TtsClip.
 */
export async function attachChapterAudio(
  blocks: ChapterBlock[],
  tts: TtsService,
): Promise<ChapterBlock[]> {
  const stored = blocks.filter(
    (b): b is PhrasesBlock | DialogBlock =>
      b.type === 'phrases' || b.type === 'dialog',
  );
  const urls = await tts.urlsFor(chapterSpecs(stored));
  let i = 0;
  return blocks.map((b) => {
    if (b.type === 'phrases')
      return {
        ...b,
        items: b.items.map((p) => ({ ...p, audioUrl: urls[i++] })),
      };
    if (b.type === 'dialog')
      return {
        ...b,
        lines: b.lines.map((l) => ({ ...l, audioUrl: urls[i++] })),
      };
    return b;
  });
}
