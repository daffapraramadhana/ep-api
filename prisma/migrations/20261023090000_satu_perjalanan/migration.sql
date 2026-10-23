-- Spec satu-perjalanan §5.3: unit "Making & Handling Complaints" ke akhir
-- Perjalanan MENENGAH, supaya karyawan yang sudah maju ke EFTL tidak ditarik
-- mundur. Urutan baru mengikuti urutan bab.
WITH cmp AS (
  SELECT l.id, ROW_NUMBER() OVER (ORDER BY c."order") AS rn
  FROM "Lesson" l
  JOIN "ModuleChapter" c ON c."lessonId" = l.id
  JOIN "Module" m ON m.id = c."moduleId"
  WHERE m.slug = 'making-handling-complaints' AND l.level = 'MENENGAH'
), base AS (
  SELECT COALESCE(MAX("order"), 0) AS mx FROM "Lesson"
  WHERE level = 'MENENGAH' AND id NOT IN (SELECT id FROM cmp)
)
UPDATE "Lesson" l SET "order" = base.mx + cmp.rn FROM cmp, base WHERE l.id = cmp.id;

-- Semua modul LIVE kini masuk Perjalanan — flag per-modul tidak lagi dipakai.
ALTER TABLE "Module" DROP COLUMN "showInPath";
