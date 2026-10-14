// apps/api/src/modules/modules.types.ts
import type { Cefr, Level } from '@prisma/client';
import type { ChapterBlock } from './blocks';

export interface ModuleCard {
  slug: string;
  title: string;
  summary: string;
  level: Level;
  cefr: Cefr;
  coverUrl: string | null;
  chapterCount: number;
  quizChapterCount: number;
  doneCount: number;
  estMinutes: number;
}

export interface ModulesView {
  inProgress: ModuleCard | null;
  forYou: ModuleCard[];
  others: ModuleCard[];
}

export interface ModuleChapterRow {
  id: string;
  order: number;
  /** nomor tampilan 1-based (order bisa bercelah setelah bab dihapus) */
  position: number;
  title: string;
  estMinutes: number;
  kind: 'quiz' | 'reading';
  done: boolean;
  accuracy: number | null;
  itemCount: number;
}

export interface ModuleDetailView extends ModuleCard {
  nextOrder: number | null;
  chapters: ModuleChapterRow[];
}

export interface ChapterView {
  id: string;
  order: number;
  position: number;
  title: string;
  estMinutes: number;
  blocks: ChapterBlock[];
  quiz: { itemCount: number; done: boolean; estXp: number | null } | null;
  prevOrder: number | null;
  nextOrder: number | null;
  chapterCount: number;
  moduleSlug: string;
  moduleTitle: string;
}

export interface ModuleInProgressView {
  slug: string;
  title: string;
  nextOrder: number;
  nextPosition: number;
  nextTitle: string;
}
