import 'dotenv/config';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { PrismaClient, ItemType, Level, Cefr, SkillTag } from '@prisma/client';

/**
 * Seed DEMO — satu modul pembelajaran lengkap: topic "Daily Conversation"
 * (level DASAR / A2), 4 lesson × 8 soal = 32 soal menutup 4 skill dan
 * 3 tipe soal, langsung LIVE.
 *
 * TERPISAH dari prisma/seed.ts (yang berjalan tiap boot container) —
 * jalankan manual saja: `npm run seed:demo`. Idempoten: upsert by
 * (lesson.code) dan (lessonId, order); aman dijalankan berulang.
 *
 * Audio listening: dibangkitkan nyata via TTS `say` + `afconvert`
 * (bawaan macOS) ke STORAGE_DIR sebagai .m4a. Bila tools tak tersedia
 * (mis. Linux), fallback ke .wav senyap 1 detik supaya player tetap
 * berfungsi — ganti dengan rekaman asli via halaman Media admin.
 */

const prisma = new PrismaClient();
const STORAGE_DIR = process.env.STORAGE_DIR ?? './storage';

type DemoItem = {
  type: ItemType;
  prompt: string;
  options?: string[];
  answerKey: string;
  acceptedAnswers?: string[];
  explanation: string;
  passage?: string;
  /** teks TTS — bila diisi, file audio dibuat & item.mediaFile menunjuk ke sana */
  tts?: string;
};

type DemoLesson = {
  code: string;
  title: string;
  skill: SkillTag;
  items: DemoItem[];
};

const TOPIC = 'Daily Conversation';
const LEVEL: Level = 'DASAR';
const CEFR: Cefr = 'A2';

const LESSONS: DemoLesson[] = [
  {
    code: 'DC-101',
    title: 'Kosakata Sehari-hari',
    skill: 'VOCABULARY',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "borrow" mean?',
        options: ['Meminjam', 'Membeli', 'Memberi', 'Menjual'],
        answerKey: 'A',
        explanation: '"Borrow" = meminjam. Contoh: "Can I borrow your pen?"',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "crowded" mean?',
        options: ['Sepi', 'Ramai', 'Bersih', 'Bising'],
        answerKey: 'B',
        explanation: '"Crowded" = ramai/penuh orang. "The market is crowded on Sunday."',
      },
      {
        type: 'ISIAN',
        prompt: 'Can I ___ your pen for a minute?',
        answerKey: 'borrow',
        acceptedAnswers: ['borrow', 'use'],
        explanation: 'Meminjam barang orang lain = "borrow". (Lawannya "lend" = meminjamkan.)',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "weekend" mean?',
        options: ['Hari kerja', 'Awal bulan', 'Akhir pekan', 'Liburan panjang'],
        answerKey: 'C',
        explanation: '"Weekend" = akhir pekan (Sabtu-Minggu).',
      },
      {
        type: 'ISIAN',
        prompt: 'I usually ___ up at six in the morning.',
        answerKey: 'wake',
        acceptedAnswers: ['wake', 'get'],
        explanation: '"Wake up" / "get up" = bangun tidur. Keduanya lazim dipakai.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "delicious" mean?',
        options: ['Mahal', 'Pedas', 'Manis', 'Lezat'],
        answerKey: 'D',
        explanation: '"Delicious" = lezat/enak. "This soup is delicious!"',
      },
      {
        type: 'ISIAN',
        prompt: "Let's ___ dinner together tonight.",
        answerKey: 'have',
        acceptedAnswers: ['have', 'eat', 'get'],
        explanation: 'Untuk makan bersama, bahasa Inggris memakai "have dinner" (bukan "do dinner").',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "nearby" mean?',
        options: ['Di dekat sini', 'Jauh', 'Di seberang', 'Di belakang'],
        answerKey: 'A',
        explanation: '"Nearby" = di dekat sini. "Is there a cafe nearby?"',
      },
    ],
  },
  {
    code: 'DC-102',
    title: 'Grammar Percakapan',
    skill: 'GRAMMAR',
    items: [
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'How was your weekend',
        explanation: 'Pola pertanyaan lampau: How + was + subjek. Sapaan umum hari Senin.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"___ you like some coffee?"',
        options: ['Do', 'Would', 'Are', 'Will'],
        answerKey: 'B',
        explanation: '"Would you like ...?" = tawaran yang sopan. "Do you like" menanyakan kesukaan umum.',
      },
      {
        type: 'ISIAN',
        prompt: 'I ___ to the market yesterday.',
        answerKey: 'went',
        acceptedAnswers: ['went'],
        explanation: '"Yesterday" menuntut bentuk lampau: go → went.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'I will call you tomorrow morning',
        explanation: 'Rencana/janji memakai "will" + kata kerja dasar.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"She ___ watching a movie right now."',
        options: ['are', 'be', 'is', 'was'],
        answerKey: 'C',
        explanation: '"Right now" = present continuous: is/are + -ing. Subjek "she" → "is".',
      },
      {
        type: 'ISIAN',
        prompt: 'We have lived here ___ 2020.',
        answerKey: 'since',
        acceptedAnswers: ['since'],
        explanation: '"Since" + titik waktu (2020); "for" + durasi (five years).',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'Could you help me with this',
        explanation: '"Could you ...?" = permintaan sopan, lebih halus dari "Can you".',
      },
      {
        type: 'ISIAN',
        prompt: 'There ___ many people at the park today.',
        answerKey: 'are',
        acceptedAnswers: ['are', 'were'],
        explanation: '"Many people" jamak → "are" (atau "were" bila bercerita lampau).',
      },
    ],
  },
  {
    code: 'DC-103',
    title: 'Membaca Pesan Singkat',
    skill: 'READING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Where are they meeting?',
        options: ['At the station', 'At the cafe', "At Dina's house", 'At the park'],
        answerKey: 'B',
        passage:
          "Hi Rina! We're meeting at the cafe near the station at 4 PM. Dina is coming too, but she will be 30 minutes late. See you there!",
        explanation: 'Kalimat pertama: "meeting at the cafe near the station" — di kafe, bukan stasiunnya.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What time is the meeting?',
        options: ['3 PM', '4.30 PM', '5 PM', '4 PM'],
        answerKey: 'D',
        passage:
          "Hi Rina! We're meeting at the cafe near the station at 4 PM. Dina is coming too, but she will be 30 minutes late. See you there!",
        explanation: 'Tertulis jelas: "at 4 PM".',
      },
      {
        type: 'ISIAN',
        prompt: 'Dina will be ___ minutes late.',
        answerKey: '30',
        acceptedAnswers: ['30', 'thirty'],
        passage:
          "Hi Rina! We're meeting at the cafe near the station at 4 PM. Dina is coming too, but she will be 30 minutes late. See you there!",
        explanation: '"She will be 30 minutes late."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When will the water be off?',
        options: ['Saturday', 'Sunday', 'Friday', 'Monday'],
        answerKey: 'A',
        passage:
          'NOTICE: The apartment water supply will be off on Saturday from 9 AM to 1 PM for pipe cleaning. Please store enough water before Saturday morning.',
        explanation: '"...will be off on Saturday from 9 AM to 1 PM."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Why is the water turned off?',
        options: ['Pipe cleaning', 'Water shortage', 'Broken pump', 'Painting work'],
        answerKey: 'A',
        passage:
          'NOTICE: The apartment water supply will be off on Saturday from 9 AM to 1 PM for pipe cleaning. Please store enough water before Saturday morning.',
        explanation: 'Alasannya disebut di akhir kalimat pertama: "for pipe cleaning".',
      },
      {
        type: 'ISIAN',
        prompt: 'The water will be off from 9 AM to ___ PM.',
        answerKey: '1',
        acceptedAnswers: ['1', 'one'],
        passage:
          'NOTICE: The apartment water supply will be off on Saturday from 9 AM to 1 PM for pipe cleaning. Please store enough water before Saturday morning.',
        explanation: '"from 9 AM to 1 PM".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Where is the writer now?',
        options: ['At home', 'On the bus', 'At the library', 'At a restaurant'],
        answerKey: 'C',
        passage:
          "Hi Mom, I'm still at the library finishing my homework. I'll take the 7 o'clock bus home, so please don't wait for dinner. I already ate with my friends.",
        explanation: '"I\'m still at the library finishing my homework."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: "Why shouldn't Mom wait for dinner?",
        options: ['He is not hungry', 'He already ate', 'He will cook himself', 'He eats at 7'],
        answerKey: 'B',
        passage:
          "Hi Mom, I'm still at the library finishing my homework. I'll take the 7 o'clock bus home, so please don't wait for dinner. I already ate with my friends.",
        explanation: 'Kalimat terakhir: "I already ate with my friends."',
      },
    ],
  },
  {
    code: 'DC-104',
    title: 'Menyimak Percakapan',
    skill: 'LISTENING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does the speaker want to buy?',
        options: ['Bus tickets', 'Museum tickets', 'Movie tickets', 'Train tickets'],
        answerKey: 'B',
        tts: 'Good morning! Two tickets to the city museum, please.',
        explanation: 'Pembicara berkata: "Two tickets to the city museum, please."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'How often does the bus leave?',
        options: ['Every 30 minutes', 'Every hour', 'Every 15 minutes', 'Twice a day'],
        answerKey: 'A',
        tts: 'The bus to the airport leaves every thirty minutes.',
        explanation: '"...leaves every thirty minutes" = tiap 30 menit.',
      },
      {
        type: 'ISIAN',
        prompt: 'The speaker is looking for a ___.',
        answerKey: 'bank',
        acceptedAnswers: ['bank'],
        tts: 'Excuse me, where is the nearest bank?',
        explanation: 'Pertanyaannya: "where is the nearest bank?"',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What should you bring this afternoon?',
        options: ['A jacket', 'A hat', 'An umbrella', 'Sunglasses'],
        answerKey: 'C',
        tts: 'It will rain this afternoon, so bring your umbrella.',
        explanation: '"...so bring your umbrella" karena akan hujan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What drink does the speaker order?',
        options: ['Iced tea', 'Hot coffee', 'Orange juice', 'Mineral water'],
        answerKey: 'A',
        tts: 'I would like to order fried rice and iced tea, please.',
        explanation: 'Pesanan minumnya: "iced tea".',
      },
      {
        type: 'ISIAN',
        prompt: 'The supermarket closes at ___ tonight.',
        answerKey: 'nine',
        acceptedAnswers: ['nine', '9'],
        tts: 'The supermarket closes at nine tonight.',
        explanation: '"...closes at nine tonight" = tutup jam 9 malam.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When do they plan to watch a movie?',
        options: ['Friday night', 'Sunday morning', 'Saturday morning', 'Saturday evening'],
        answerKey: 'D',
        tts: "Let's watch a movie on Saturday evening.",
        explanation: '"on Saturday evening" = Sabtu malam.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Where should you turn left?',
        options: ['At the traffic light', 'At the corner', 'At the bridge', 'At the school'],
        answerKey: 'A',
        tts: 'Please turn left at the traffic light.',
        explanation: '"turn left at the traffic light" = belok kiri di lampu merah.',
      },
    ],
  },
];

/** WAV PCM senyap 1 detik — fallback bila TTS macOS tak tersedia. */
function silentWav(): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 detik
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function hasMacTts(): boolean {
  try {
    execFileSync('which', ['say'], { stdio: 'pipe' });
    execFileSync('which', ['afconvert'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Buat file audio untuk satu frasa; return nama file di storage. */
function makeAudio(baseName: string, text: string, useTts: boolean): string {
  mkdirSync(STORAGE_DIR, { recursive: true });
  if (useTts) {
    const name = `${baseName}.m4a`;
    const target = path.join(STORAGE_DIR, name);
    if (!existsSync(target)) {
      const aiff = path.join(STORAGE_DIR, `${baseName}.aiff`);
      // Samantha = suara en-US default yang tersedia luas; rate sedikit pelan
      // agar ramah pembelajar.
      execFileSync('say', ['-v', 'Samantha', '-r', '150', '-o', aiff, text]);
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, target]);
      execFileSync('rm', ['-f', aiff]);
    }
    return name;
  }
  const name = `${baseName}.wav`;
  const target = path.join(STORAGE_DIR, name);
  if (!existsSync(target)) writeFileSync(target, silentWav());
  return name;
}

async function main() {
  const useTts = hasMacTts();
  if (!useTts) {
    console.warn(
      '⚠ TTS macOS (say/afconvert) tidak tersedia — audio listening memakai WAV senyap.',
    );
  }

  // urutan lesson: lanjut dari max(order) level ini (pola importer)
  const maxOrder = await prisma.lesson.aggregate({
    where: { level: LEVEL },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  let lessonsUpserted = 0;
  let itemsUpserted = 0;
  let audioFiles = 0;

  for (const dl of LESSONS) {
    const existing = await prisma.lesson.findUnique({ where: { code: dl.code } });
    const lesson = existing
      ? await prisma.lesson.update({
          where: { id: existing.id },
          data: { title: dl.title, topic: TOPIC, level: LEVEL, cefr: CEFR, skill: dl.skill, status: 'LIVE' },
        })
      : await prisma.lesson.create({
          data: {
            code: dl.code,
            title: dl.title,
            topic: TOPIC,
            level: LEVEL,
            cefr: CEFR,
            skill: dl.skill,
            order: nextOrder++,
            status: 'LIVE',
          },
        });
    lessonsUpserted++;

    for (let i = 0; i < dl.items.length; i++) {
      const it = dl.items[i];
      let mediaFile: string | null = null;
      if (it.tts) {
        mediaFile = makeAudio(`${dl.code.toLowerCase()}-${String(i + 1).padStart(2, '0')}`, it.tts, useTts);
        audioFiles++;
      }
      const acceptedAnswers =
        it.type === 'ISIAN'
          ? Array.from(new Set([it.answerKey, ...(it.acceptedAnswers ?? [])].map((a) => a.trim())))
          : [];
      const data = {
        type: it.type,
        prompt: it.prompt,
        options: it.options ?? undefined,
        answerKey: it.answerKey,
        acceptedAnswers,
        explanation: it.explanation,
        mediaFile,
        passage: it.passage ?? null,
        status: 'LIVE' as const,
      };
      await prisma.item.upsert({
        where: { lessonId_order: { lessonId: lesson.id, order: i + 1 } },
        update: data,
        create: { ...data, lessonId: lesson.id, order: i + 1 },
      });
      itemsUpserted++;
    }
  }

  console.log(
    `✔ Demo module "${TOPIC}" (${LEVEL}/${CEFR}): ${lessonsUpserted} lesson, ${itemsUpserted} soal, ${audioFiles} audio (${useTts ? 'TTS m4a' : 'silent wav'}) — semua LIVE.`,
  );
  console.log('  Lihat sebagai user level DASAR (ganti level di Profil bila perlu).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
