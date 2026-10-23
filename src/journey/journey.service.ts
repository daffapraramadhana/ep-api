import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';

export type JourneyStepState = 'done' | 'now' | 'locked';

export interface JourneyStepView {
  kind: 'lesson' | 'chapter' | 'reading';
  id: string; // lessonId (lesson/chapter) | chapterId (reading)
  title: string; // judul lesson | judul bab
  state: JourneyStepState | null; // null untuk reading
  accuracy: number | null; // first-try %, done saja
  itemCount: number; // 0 untuk reading
  chapter: {
    moduleSlug: string;
    chapterId: string;
    order: number;
    position: number;
    estMinutes: number;
  } | null;
}

export interface JourneyUnitView {
  kind: 'topic' | 'module';
  title: string;
  moduleSlug: string | null;
  done: number; // langkah dihitung saja (lesson/chapter)
  total: number;
  steps: JourneyStepView[];
}

export interface JourneyView {
  units: JourneyUnitView[];
  done: number;
  total: number;
}

@Injectable()
export class JourneyService {
  constructor(
    private prisma: PrismaService,
    private session: SessionService,
  ) {}

  /**
   * Perjalanan per unit (spec satu-perjalanan §5.1–5.2). Unit & urutan dari
   * `SessionService.path()` — sumber yang sama dengan mesin sesi, jadi
   * Beranda/Perjalanan/sesi harian tak pernah menunjuk langkah berbeda.
   * Status: selesai → selalu `done` (di mana pun posisinya); langkah pertama
   * yang belum selesai → `now`; sisanya `locked`. Bab bacaan (tanpa kuis
   * jalur) tampil di unit modulnya tanpa dihitung. Query: path (2) +
   * attempt firstTry (1) + bab modul (1), tanpa N+1.
   */
  async get(userId: string): Promise<JourneyView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    if (!user?.level) return { units: [], done: 0, total: 0 };

    const { units, lessons, done } = await this.session.path(
      userId,
      user.level,
    );
    if (!lessons.length) return { units: [], done: 0, total: 0 };

    const nowId = lessons.find((l) => !done.get(l.id))?.id ?? null;

    const firstTryCorrect = new Set(
      (
        await this.prisma.attempt.findMany({
          where: {
            userId,
            itemId: { in: lessons.flatMap((l) => l.items.map((i) => i.id)) },
            firstTry: true,
            correct: true,
          },
          select: { itemId: true },
        })
      ).map((a) => a.itemId),
    );

    const moduleIds = units.flatMap((u) => (u.moduleId ? [u.moduleId] : []));
    const chapters = moduleIds.length
      ? await this.prisma.moduleChapter.findMany({
          where: { moduleId: { in: moduleIds } },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            moduleId: true,
            order: true,
            title: true,
            estMinutes: true,
            lessonId: true,
            lesson: {
              select: {
                status: true,
                items: {
                  where: { status: 'LIVE' },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        })
      : [];

    const lessonStep = (
      l: (typeof lessons)[number],
    ): Pick<JourneyStepView, 'state' | 'accuracy' | 'itemCount'> => {
      const isDone = done.get(l.id) ?? false;
      return {
        state: isDone ? 'done' : l.id === nowId ? 'now' : 'locked',
        accuracy: isDone
          ? Math.round(
              (l.items.filter((i) => firstTryCorrect.has(i.id)).length /
                l.items.length) *
                100,
            )
          : null,
        itemCount: l.items.length,
      };
    };

    const view: JourneyUnitView[] = units.map((u) => {
      let steps: JourneyStepView[];
      if (u.kind === 'topic') {
        steps = u.lessons.map((l) => ({
          kind: 'lesson',
          id: l.id,
          title: l.title,
          ...lessonStep(l),
          chapter: null,
        }));
      } else {
        const byLesson = new Map(u.lessons.map((l) => [l.id, l]));
        const modChapters = chapters.filter((c) => c.moduleId === u.moduleId);
        steps = modChapters.flatMap((c, i): JourneyStepView[] => {
          const chapter = {
            moduleSlug: u.moduleSlug!,
            chapterId: c.id,
            order: c.order,
            position: i + 1,
            estMinutes: c.estMinutes,
          };
          const l = c.lessonId ? byLesson.get(c.lessonId) : undefined;
          if (l)
            return [
              {
                kind: 'chapter',
                id: l.id,
                title: c.title,
                ...lessonStep(l),
                chapter,
              },
            ];
          const quizless =
            !c.lesson ||
            c.lesson.status !== 'LIVE' ||
            c.lesson.items.length === 0;
          // Kuis jalur di level lain → bukan bacaan; tampil di level itu.
          if (!quizless) return [];
          return [
            {
              kind: 'reading',
              id: c.id,
              title: c.title,
              state: null,
              accuracy: null,
              itemCount: 0,
              chapter,
            },
          ];
        });
      }
      const counted = steps.filter((s) => s.kind !== 'reading');
      return {
        kind: u.kind,
        title: u.title,
        moduleSlug: u.moduleSlug,
        done: counted.filter((s) => s.state === 'done').length,
        total: counted.length,
        steps,
      };
    });

    return {
      units: view,
      done: view.reduce((n, u) => n + u.done, 0),
      total: view.reduce((n, u) => n + u.total, 0),
    };
  }
}
