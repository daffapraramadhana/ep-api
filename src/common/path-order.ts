// apps/api/src/common/path-order.ts
import { ContentStatus } from '@prisma/client';

/**
 * Unit & urutan langkah Perjalanan (spec satu-perjalanan §5.1–5.3) — SATU
 * sumber untuk /journey, Beranda, dan mesin sesi (harian/berbicara).
 *
 * - Lesson bab modul LIVE → unit modul (kunci = modul, bukan string topik),
 *   diurutkan per `ModuleChapter.order` (bukan `Lesson.order`, yang bisa
 *   menyimpang saat admin memindah bab).
 * - Lesson lain (termasuk bab modul DRAFT/RETIRED) → unit topik, per `Lesson.order`.
 * - Unit diurutkan per `Lesson.order` terkecil di dalamnya; seri → key.
 */
export interface PathLessonInput {
  id: string;
  order: number;
  topic: string;
  moduleChapter: {
    order: number;
    module: { id: string; slug: string; title: string; status: ContentStatus };
  } | null;
}

export interface PathUnit<T extends PathLessonInput> {
  kind: 'topic' | 'module';
  key: string;
  title: string;
  moduleId: string | null;
  moduleSlug: string | null;
  lessons: T[];
}

export function groupPath<T extends PathLessonInput>(
  lessons: T[],
): PathUnit<T>[] {
  const units = new Map<string, PathUnit<T>>();
  for (const l of lessons) {
    const m =
      l.moduleChapter?.module.status === 'LIVE' ? l.moduleChapter.module : null;
    const key = m ? `module:${m.id}` : `topic:${l.topic}`;
    let u = units.get(key);
    if (!u) {
      u = {
        kind: m ? 'module' : 'topic',
        key,
        title: m ? m.title : l.topic,
        moduleId: m?.id ?? null,
        moduleSlug: m?.slug ?? null,
        lessons: [],
      };
      units.set(key, u);
    }
    u.lessons.push(l);
  }
  const minOrder = (u: PathUnit<T>) =>
    Math.min(...u.lessons.map((l) => l.order));
  for (const u of units.values()) {
    u.lessons.sort((a, b) =>
      u.kind === 'module'
        ? a.moduleChapter!.order - b.moduleChapter!.order
        : a.order - b.order,
    );
  }
  return [...units.values()].sort(
    (a, b) => minOrder(a) - minOrder(b) || a.key.localeCompare(b.key),
  );
}

export function flattenPath<T extends PathLessonInput>(
  units: PathUnit<T>[],
): T[] {
  return units.flatMap((u) => u.lessons);
}
