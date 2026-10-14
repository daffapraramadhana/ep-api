import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { PATH_LESSON } from '../common/content-scope';

type LessonState = 'done' | 'now' | 'locked';

export interface JourneyLessonView {
  id: string;
  title: string;
  order: number;
  state: LessonState;
  accuracy: number | null; // first-try %, done saja
}

export interface JourneyTopicView {
  topic: string;
  lessons: JourneyLessonView[];
}

export interface JourneyView {
  topics: JourneyTopicView[];
}

@Injectable()
export class JourneyService {
  constructor(
    private prisma: PrismaService,
    private session: SessionService,
  ) {}

  /**
   * One lessons query (LIVE at the user's level, with LIVE items) + one
   * attempts query (this user's firstTry-correct answers among those
   * items) — done/now/locked and accuracy are all computed in memory from
   * those two result sets plus the shared `lessonCompletion` map (itself
   * one more lessons query + one more attempts query, encapsulated in
   * SessionService and reused here via SessionModule's export). No
   * per-lesson queries.
   */
  async get(userId: string): Promise<JourneyView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    if (!user?.level) return { topics: [] };

    const lessons = await this.prisma.lesson.findMany({
      where: { level: user.level, status: 'LIVE', ...PATH_LESSON },
      orderBy: { order: 'asc' },
      include: { items: { where: { status: 'LIVE' }, select: { id: true } } },
    });
    if (!lessons.length) return { topics: [] };

    const doneMap = await this.session.lessonCompletion(userId, user.level);

    const allItemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
    const firstTryCorrect = allItemIds.length
      ? await this.prisma.attempt.findMany({
          where: {
            userId,
            itemId: { in: allItemIds },
            firstTry: true,
            correct: true,
          },
          select: { itemId: true },
        })
      : [];
    const firstTryCorrectSet = new Set(firstTryCorrect.map((a) => a.itemId));

    // Assign state walking the GLOBAL level order (not per-topic): every
    // lesson before the first not-done one is 'done', the first not-done
    // one is 'now', and everything after that — regardless of its own
    // completion status — is 'locked'.
    let seenNow = false;
    const lessonViewById = new Map<string, JourneyLessonView>();
    for (const l of lessons) {
      const done = doneMap.get(l.id) ?? false;
      let state: LessonState;
      if (!seenNow) {
        if (done) {
          state = 'done';
        } else {
          state = 'now';
          seenNow = true;
        }
      } else {
        state = 'locked';
      }

      const accuracy =
        state === 'done' && l.items.length > 0
          ? Math.round(
              (l.items.filter((i) => firstTryCorrectSet.has(i.id)).length /
                l.items.length) *
                100,
            )
          : null;

      lessonViewById.set(l.id, {
        id: l.id,
        title: l.title,
        order: l.order,
        state,
        accuracy,
      });
    }

    // Group into topics. Since `lessons` is already sorted by order asc,
    // the first-seen order of each topic name is exactly that topic's
    // minimum lesson order.
    const topicOrder: string[] = [];
    const topicLessons = new Map<string, JourneyLessonView[]>();
    for (const l of lessons) {
      if (!topicLessons.has(l.topic)) {
        topicLessons.set(l.topic, []);
        topicOrder.push(l.topic);
      }
      topicLessons.get(l.topic)!.push(lessonViewById.get(l.id)!);
    }

    const topics: JourneyTopicView[] = topicOrder.map((topic) => ({
      topic,
      lessons: topicLessons.get(topic)!.sort((a, b) => a.order - b.order),
    }));

    return { topics };
  }
}
