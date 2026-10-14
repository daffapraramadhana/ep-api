// apps/api/src/modules/blocks.ts
import { StorageService } from '../storage/storage.service';
import type { StoredBlock } from './chapter-parser';

/** Bentuk blok yang dikirim ke FE: file media sudah jadi URL publik. */
export type ChapterBlock =
  | Exclude<StoredBlock, { type: 'image' } | { type: 'audio' }>
  | { type: 'image'; url: string; alt: string }
  | { type: 'audio'; url: string };

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
