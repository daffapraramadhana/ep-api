// apps/api/prisma/validate-module.ts
// Cek definisi modul TANPA menulis DB: `npx ts-node prisma/validate-module.ts seed-eftl-2`
import type { KitModule } from './seed-module-kit';
import { validateModule } from './seed-module-kit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require(`./${process.argv[2]}`) as { def?: KitModule };
if (!mod.def) {
  console.error(`✖ ${process.argv[2]} tidak mengekspor \`def\``);
  process.exit(1);
}
const def = mod.def;
const errors = validateModule(def);
const items = def.chapters.flatMap((c) => c.items);
const keys = items
  .filter((it) => it.type === 'PILIHAN_GANDA')
  .reduce<Record<string, number>>(
    (acc, it) => ({ ...acc, [it.answerKey]: (acc[it.answerKey] ?? 0) + 1 }),
    {},
  );
const types = items.reduce<Record<string, number>>(
  (acc, it) => ({ ...acc, [it.type]: (acc[it.type] ?? 0) + 1 }),
  {},
);
console.log(
  `${def.title}: ${def.chapters.length} bab, ${items.length} soal`,
  JSON.stringify(types),
  'kunci PG',
  JSON.stringify(keys),
);
if (errors.length) {
  console.error(`✖ ${errors.length} kesalahan:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('✔ valid');
