import { ContentStatus } from '@prisma/client';
import { flattenPath, groupPath, PathLessonInput } from './path-order';

const mod = (id: string, status: ContentStatus = 'LIVE') => ({
  id,
  slug: `slug-${id}`,
  title: `Modul ${id}`,
  status,
});

const lesson = (
  id: string,
  order: number,
  topic: string,
  chapter?: { order: number; module: ReturnType<typeof mod> },
): PathLessonInput => ({
  id,
  order,
  topic,
  moduleChapter: chapter ?? null,
});

describe('groupPath', () => {
  it('groups topic lessons and orders units by min lesson order', () => {
    const units = groupPath([
      lesson('a1', 1, 'A'),
      lesson('b3', 3, 'B'),
      lesson('a5', 5, 'A'),
    ]);
    expect(units.map((u) => u.title)).toEqual(['A', 'B']);
    expect(units[0].lessons.map((l) => l.id)).toEqual(['a1', 'a5']);
    expect(flattenPath(units).map((l) => l.id)).toEqual(['a1', 'a5', 'b3']);
  });

  it('module lessons form one unit ordered by chapter order, not lesson order', () => {
    const m = mod('m');
    const units = groupPath([
      lesson('x', 10, 'T', { order: 2, module: m }),
      lesson('y', 11, 'T', { order: 1, module: m }),
    ]);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      kind: 'module',
      key: 'module:m',
      title: 'Modul m',
      moduleId: 'm',
      moduleSlug: 'slug-m',
    });
    expect(units[0].lessons.map((l) => l.id)).toEqual(['y', 'x']);
  });

  it('module unit key never merges with a topic unit of the same topic string', () => {
    const units = groupPath([
      lesson('t', 1, 'Greetings'),
      lesson('m1', 2, 'Greetings', { order: 1, module: mod('m') }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(['topic', 'module']);
  });

  it('lesson linked to a DRAFT or RETIRED module stays in its topic unit', () => {
    const units = groupPath([
      lesson('d', 1, 'Draft', { order: 1, module: mod('d', 'DRAFT') }),
      lesson('r', 2, 'Draft', { order: 1, module: mod('r', 'RETIRED') }),
    ]);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      kind: 'topic',
      key: 'topic:Draft',
      moduleId: null,
      moduleSlug: null,
    });
  });

  it('module unit position follows its smallest lesson order', () => {
    const m = mod('m');
    const units = groupPath([
      lesson('t', 25, 'Topik'),
      lesson('m2', 30, 'X', { order: 2, module: m }),
      lesson('m1', 20, 'X', { order: 1, module: m }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(['module', 'topic']);
  });
});
