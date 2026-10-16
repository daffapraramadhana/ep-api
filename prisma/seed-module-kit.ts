// apps/api/prisma/seed-module-kit.ts
import 'dotenv/config';
import {
  Cefr,
  ItemType,
  Level,
  Prisma,
  PrismaClient,
  SkillTag,
} from '@prisma/client';
import { parseChapter } from '../src/modules/chapter-parser';
import { parseTtsScript, TTS_MAX_CHARS } from '../src/tts/tts-text';

/**
 * Runner bersama untuk seeder "satu sumber = satu modul" (mis. PDF EFTL 1..5).
 * Satu definisi berisi modul + bab + kuis per bab; runner membuat lesson+soal
 * lalu modul+bab yang menautkan lesson itu — urutan yang di seed-complaints
 * + seed-module-complaints dulu dipisah dua file.
 *
 * CREATE-ONLY: lesson (by code), soal (by lessonId+order), modul (by slug),
 * bab (by moduleId+order) yang sudah ada DILEWATI — edit admin aman, tapi
 * koreksi teks di file definisi tidak merambat ke data yang sudah ter-seed.
 * Semua body bab & soal divalidasi dulu; gagal keras sebelum menulis apa pun.
 */

export type KitItem = {
  type: ItemType;
  prompt: string;
  /** PILIHAN_GANDA: tepat 4 opsi, answerKey 'A'..'D' */
  options?: string[];
  answerKey: string;
  acceptedAnswers?: string[];
  explanation: string;
  passage?: string;
  /** teks yang dibacakan suara AI → Item.ttsText (audio Kokoro dibuat server) */
  tts?: string;
};

export type KitChapter = {
  /** kode lesson kuis bab ini (unik global) */
  code: string;
  title: string;
  skill: SkillTag;
  cefr: Cefr;
  estMinutes: number;
  /** Markdown bab — sintaks parseChapter */
  body: string;
  items: KitItem[];
};

export type KitModule = {
  slug: string;
  title: string;
  summary: string;
  /** Lesson.topic untuk semua kuis modul ini */
  topic: string;
  level: Level;
  cefr: Cefr;
  status: 'DRAFT' | 'LIVE';
  /** kuis bab ikut Perjalanan & sesi harian (Module.showInPath) */
  showInPath?: boolean;
  chapters: KitChapter[];
};

/** Semua kesalahan definisi (kosong = valid) — dipakai seedModule & validate-module. */
export function validateModule(def: KitModule): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();
  for (const c of def.chapters) {
    if (codes.has(c.code)) errors.push(`${c.code}: kode dobel`);
    codes.add(c.code);
    const r = parseChapter(c.body);
    if ('errors' in r)
      errors.push(
        ...r.errors.map((e) => `${c.code} body baris ${e.line}: ${e.message}`),
      );
    else if (r.media.length)
      errors.push(`${c.code}: body seeder tidak boleh memakai media`);
    c.items.forEach((it, i) => {
      const at = `${c.code} soal ${i + 1}`;
      if (it.type === 'PILIHAN_GANDA') {
        if (it.options?.length !== 4) errors.push(`${at}: butuh tepat 4 opsi`);
        if (!/^[ABCD]$/.test(it.answerKey))
          errors.push(`${at}: answerKey harus A-D`);
      } else if (it.options)
        errors.push(`${at}: opsi hanya untuk PILIHAN_GANDA`);
      if (
        (it.type === 'SUSUN_KALIMAT' || it.type === 'UCAPAN') &&
        it.answerKey.trim().split(/\s+/).length < 2
      )
        errors.push(`${at}: minimal 2 kata`);
      if (it.type === 'SUSUN_KALIMAT' && /[.,!?]/.test(it.answerKey))
        errors.push(`${at}: kunci susun tanpa tanda baca (jadi chip)`);
      if (
        it.type === 'SUSUN_KALIMAT' &&
        it.answerKey.trim().split(/\s+/).length < 3
      )
        errors.push(`${at}: kunci susun minimal 3 kata (aturan importer)`);
      if (it.tts !== undefined) {
        if (it.tts.length > TTS_MAX_CHARS)
          errors.push(`${at}: tts maksimal ${TTS_MAX_CHARS} karakter`);
        const script = parseTtsScript(it.tts);
        if ('error' in script) errors.push(`${at}: tts ${script.error}`);
        else if (!script.segments.length)
          errors.push(`${at}: tts tidak berisi teks yang bisa diucapkan`);
      }
    });
  }
  return errors;
}

function validate(def: KitModule) {
  const errors = validateModule(def);
  if (errors.length)
    throw new Error(
      `Definisi "${def.title}" tidak valid:\n- ${errors.join('\n- ')}`,
    );
}

export async function seedModule(def: KitModule) {
  validate(def);
  const prisma = new PrismaClient();
  try {
    // urutan lesson: lanjut dari max(order) level ini (pola importer)
    const maxOrder = await prisma.lesson.aggregate({
      where: { level: def.level },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? 0) + 1;
    let lessonsCreated = 0;
    let itemsCreated = 0;
    let itemsSkipped = 0;
    let audioFiles = 0;
    const lessonIds = new Map<string, string>();

    for (const c of def.chapters) {
      let lesson = await prisma.lesson.findUnique({ where: { code: c.code } });
      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: {
            code: c.code,
            title: c.title,
            topic: def.topic,
            level: def.level,
            cefr: c.cefr,
            skill: c.skill,
            order: nextOrder++,
            status: def.status,
          },
        });
        lessonsCreated++;
      }
      lessonIds.set(c.code, lesson.id);

      for (const [i, it] of c.items.entries()) {
        const order = i + 1;
        const exists = await prisma.item.findUnique({
          where: { lessonId_order: { lessonId: lesson.id, order } },
          select: { id: true },
        });
        if (exists) {
          itemsSkipped++;
          continue;
        }
        if (it.tts) audioFiles++;
        const acceptedAnswers =
          it.type === 'ISIAN'
            ? Array.from(
                new Set(
                  [it.answerKey, ...(it.acceptedAnswers ?? [])].map((a) =>
                    a.trim(),
                  ),
                ),
              )
            : [];
        await prisma.item.create({
          data: {
            lessonId: lesson.id,
            order,
            type: it.type,
            prompt: it.prompt,
            options: it.options ?? undefined,
            answerKey: it.answerKey,
            acceptedAnswers,
            explanation: it.explanation,
            ttsText: it.tts ?? null,
            passage: it.passage ?? null,
            status: def.status,
          },
        });
        itemsCreated++;
      }
    }

    let mod = await prisma.module.findUnique({ where: { slug: def.slug } });
    if (!mod) {
      const max = await prisma.module.aggregate({ _max: { order: true } });
      mod = await prisma.module.create({
        data: {
          slug: def.slug,
          title: def.title,
          summary: def.summary,
          level: def.level,
          cefr: def.cefr,
          order: (max._max.order ?? 0) + 1,
          status: def.status,
          showInPath: def.showInPath ?? false,
        },
      });
      console.log(`Modul dibuat: ${mod.title}`);
    } else {
      console.log(`Modul sudah ada, dilewati: ${mod.title}`);
    }

    let chaptersCreated = 0;
    for (const [idx, c] of def.chapters.entries()) {
      const order = idx + 1;
      const exists = await prisma.moduleChapter.findUnique({
        where: { moduleId_order: { moduleId: mod.id, order } },
      });
      if (exists) continue;
      const linked = await prisma.moduleChapter.findUnique({
        where: { lessonId: lessonIds.get(c.code)! },
      });
      if (linked)
        console.warn(
          `  ! ${c.code} sudah dipakai bab lain — bab ${order} jadi Bacaan`,
        );
      const parsed = parseChapter(c.body);
      await prisma.moduleChapter.create({
        data: {
          moduleId: mod.id,
          order,
          title: c.title,
          estMinutes: c.estMinutes,
          body: c.body,
          blocks: (parsed.ok
            ? parsed.blocks
            : []) as unknown as Prisma.InputJsonValue,
          lessonId: linked ? null : lessonIds.get(c.code)!,
        },
      });
      chaptersCreated++;
    }

    console.log(
      `✔ "${def.title}" (${def.level}, ${def.status}): ${lessonsCreated} lesson baru, ${itemsCreated} soal baru (${audioFiles} audio), ${itemsSkipped} soal dilewati, ${chaptersCreated} bab baru.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
