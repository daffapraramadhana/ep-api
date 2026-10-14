// apps/api/src/modules/slug.spec.ts
import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Making & Handling Complaints', 'making-handling-complaints'],
    ['  Écrire des E-mails!  ', 'ecrire-des-e-mails'],
    ['---', ''],
  ])('%s → %s', (input, out) => expect(slugify(input)).toBe(out));

  it('maksimal 60 karakter tanpa tanda hubung di ujung', () => {
    const s = slugify('a'.repeat(59) + ' bcd');
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);
  });
});
