import 'dotenv/config';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { PrismaClient, ItemType, Level, Cefr, SkillTag } from '@prisma/client';
import { Client as MinioClient } from 'minio';

/**
 * Seed DEMO — satu modul pembelajaran lengkap per level supaya semua
 * environment (lokal/staging) punya data seragam:
 *   DASAR    / A2 — "Daily Conversation"      (DC-101..104)
 *   MENENGAH / B1 — "Workplace Communication" (WC-201..204)
 *   MAHIR    / C1 — "Professional English"    (PE-301..304)
 * Tiap modul: 4 lesson × 8 soal menutup 4 skill dan 3 tipe soal,
 * langsung LIVE.
 *
 * TERPISAH dari prisma/seed.ts (yang berjalan tiap boot container) —
 * jalankan manual saja: `npm run seed:demo`. Idempoten: upsert by
 * (lesson.code) dan (lessonId, order); aman dijalankan berulang.
 *
 * Audio listening: dibangkitkan nyata via TTS `say` + `afconvert`
 * (bawaan macOS) sebagai .m4a. Tujuan penyimpanan mengikuti STORAGE_DRIVER:
 * minio → objek di bucket (env MINIO_*), selain itu → STORAGE_DIR lokal.
 * Bila `<nama>.m4a` sudah ada di storage tujuan (mis. diunggah lebih dulu
 * lewat `npm run audio:push:minio`), itu yang dipakai. Bila TTS tak
 * tersedia (mis. Linux) dan .m4a tidak ada, fallback .wav senyap 1 detik
 * supaya player tetap berfungsi — ganti via halaman Media admin.
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

type DemoModule = {
  topic: string;
  level: Level;
  cefr: Cefr;
  lessons: DemoLesson[];
};

const DASAR_LESSONS: DemoLesson[] = [
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
      {
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'Could you speak more slowly please',
        explanation: 'Frasa minta pelan-pelan saat lawan bicara terlalu cepat.',
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
      {
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'How was your weekend',
        explanation: 'Latihan pelafalan sapaan lampau.',
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
      {
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'We are meeting at the cafe near the station',
        explanation: 'Dari pesan Rina: "meeting at the cafe near the station".',
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

const MENENGAH_LESSONS: DemoLesson[] = [
  {
    code: 'WC-201',
    title: 'Kosakata Kantor',
    skill: 'VOCABULARY',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "deadline" mean?',
        options: ['Batas waktu', 'Jadwal rapat', 'Hari libur', 'Jam lembur'],
        answerKey: 'A',
        explanation: '"Deadline" = batas waktu. "The deadline for this report is Friday."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "colleague" mean?',
        options: ['Atasan', 'Rekan kerja', 'Klien', 'Pelamar'],
        answerKey: 'B',
        explanation: '"Colleague" = rekan kerja. "She is my colleague from the finance team."',
      },
      {
        type: 'ISIAN',
        prompt: 'Please ___ the report to me before Friday.',
        answerKey: 'send',
        acceptedAnswers: ['send', 'submit', 'email'],
        explanation: 'Mengirim dokumen kerja: "send/submit/email the report".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "attach" mean in an email?',
        options: ['Meneruskan', 'Menghapus', 'Melampirkan', 'Membalas'],
        answerKey: 'C',
        explanation: '"Attach" = melampirkan file. "I attached the invoice to this email."',
      },
      {
        type: 'ISIAN',
        prompt: 'We need to ___ a meeting for next Monday.',
        answerKey: 'schedule',
        acceptedAnswers: ['schedule', 'arrange', 'set'],
        explanation: 'Menjadwalkan rapat = "schedule/arrange a meeting".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "postpone" mean?',
        options: ['Membatalkan', 'Mempercepat', 'Memulai', 'Menunda'],
        answerKey: 'D',
        explanation: '"Postpone" = menunda. "The meeting was postponed to next week."',
      },
      {
        type: 'ISIAN',
        prompt: 'I will be ___ of the office next week.',
        answerKey: 'out',
        acceptedAnswers: ['out'],
        explanation: '"Out of the office" (OOO) = sedang tidak di kantor/cuti.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "follow up" mean?',
        options: ['Menindaklanjuti', 'Mengikuti rapat', 'Menyusul terlambat', 'Memeriksa email'],
        answerKey: 'A',
        explanation: '"Follow up" = menindaklanjuti. "I will follow up on your request tomorrow."',
      },
    ],
  },
  {
    code: 'WC-202',
    title: 'Grammar di Tempat Kerja',
    skill: 'GRAMMAR',
    items: [
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'I have finished the monthly report',
        explanation: 'Present perfect (have + V3) untuk pekerjaan yang baru saja selesai.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"The meeting ___ moved to 3 PM."',
        options: ['has been', 'have been', 'is being move', 'was be'],
        answerKey: 'A',
        explanation: 'Kalimat pasif present perfect: has been + V3. Subjek "the meeting" tunggal.',
      },
      {
        type: 'ISIAN',
        prompt: 'If you need help, please ___ me know.',
        answerKey: 'let',
        acceptedAnswers: ['let'],
        explanation: '"Let me know" = beri tahu saya. Frasa sangat umum di email kerja.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'Could you send me the file by noon',
        explanation: '"Could you ...?" permintaan sopan; "by noon" = paling lambat tengah hari.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"She ___ working here since 2019."',
        options: ['is', 'has been', 'was', 'will be'],
        answerKey: 'B',
        explanation: '"Since 2019" menuntut present perfect continuous: has been + -ing.',
      },
      {
        type: 'ISIAN',
        prompt: 'The report was written ___ our team.',
        answerKey: 'by',
        acceptedAnswers: ['by'],
        explanation: 'Kalimat pasif memakai "by" untuk pelaku: "written by our team".',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'We are going to launch the product next month',
        explanation: 'Rencana yang sudah pasti memakai "be going to" + kata kerja dasar.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"___ you attend the meeting, please take notes."',
        options: ['If', 'Unless', 'Although', 'Despite'],
        answerKey: 'A',
        explanation: 'Conditional tipe 1: "If you attend ..., please ...".',
      },
    ],
  },
  {
    code: 'WC-203',
    title: 'Membaca Email Kerja',
    skill: 'READING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When is the client meeting now?',
        options: ['Tuesday', 'Thursday', 'Monday', 'Friday'],
        answerKey: 'B',
        passage:
          'Dear team, The client meeting has been moved from Tuesday to Thursday at 10 AM in Meeting Room B. Please update your calendars and prepare the sales report beforehand. Regards, Maya',
        explanation: '"...moved from Tuesday to Thursday" — jadwal barunya Kamis.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What should the team prepare?',
        options: ['The budget plan', 'The meeting room', 'The sales report', 'The invitation'],
        answerKey: 'C',
        passage:
          'Dear team, The client meeting has been moved from Tuesday to Thursday at 10 AM in Meeting Room B. Please update your calendars and prepare the sales report beforehand. Regards, Maya',
        explanation: '"...prepare the sales report beforehand."',
      },
      {
        type: 'ISIAN',
        prompt: 'The meeting will be in Meeting Room ___.',
        answerKey: 'b',
        acceptedAnswers: ['b'],
        passage:
          'Dear team, The client meeting has been moved from Tuesday to Thursday at 10 AM in Meeting Room B. Please update your calendars and prepare the sales report beforehand. Regards, Maya',
        explanation: '"...at 10 AM in Meeting Room B."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'How did the client feel about the presentation?',
        options: ['Disappointed', 'Confused', 'Impressed', 'Bored'],
        answerKey: 'C',
        passage:
          'Hi Andi, Thank you for your presentation yesterday. The client was impressed and wants to move forward with the project. Can we discuss the timeline tomorrow after lunch? Best, Sinta',
        explanation: '"The client was impressed..." = terkesan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What will Andi and Sinta discuss tomorrow?',
        options: ['The budget', 'The timeline', 'The contract', 'The venue'],
        answerKey: 'B',
        passage:
          'Hi Andi, Thank you for your presentation yesterday. The client was impressed and wants to move forward with the project. Can we discuss the timeline tomorrow after lunch? Best, Sinta',
        explanation: '"Can we discuss the timeline tomorrow after lunch?"',
      },
      {
        type: 'ISIAN',
        prompt: 'They will meet tomorrow after ___.',
        answerKey: 'lunch',
        acceptedAnswers: ['lunch'],
        passage:
          'Hi Andi, Thank you for your presentation yesterday. The client was impressed and wants to move forward with the project. Can we discuss the timeline tomorrow after lunch? Best, Sinta',
        explanation: '"...tomorrow after lunch".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is happening on Friday?',
        options: ['An office party', 'Elevator maintenance', 'A fire drill', 'A building closure'],
        answerKey: 'B',
        passage:
          'NOTICE: The office elevator will be under maintenance on Friday. Please use the stairs or the elevator in Building B. We apologize for the inconvenience.',
        explanation: '"The office elevator will be under maintenance on Friday."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What should employees use instead?',
        options: ['The parking lift', 'The escalator', 'The stairs', 'The back door'],
        answerKey: 'C',
        passage:
          'NOTICE: The office elevator will be under maintenance on Friday. Please use the stairs or the elevator in Building B. We apologize for the inconvenience.',
        explanation: '"Please use the stairs or the elevator in Building B."',
      },
    ],
  },
  {
    code: 'WC-204',
    title: 'Menyimak di Kantor',
    skill: 'LISTENING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What time does the meeting start?',
        options: ['9.30', '9.00', '10.30', '8.30'],
        answerKey: 'A',
        tts: 'The project meeting starts at half past nine.',
        explanation: '"Half past nine" = 9.30.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Where should the documents be sent?',
        options: ['Finance', 'The HR department', 'Reception', 'The manager'],
        answerKey: 'B',
        tts: 'Please send the signed documents to the HR department.',
        explanation: '"...to the HR department."',
      },
      {
        type: 'ISIAN',
        prompt: 'The printer on the ___ floor is broken.',
        answerKey: 'second',
        acceptedAnswers: ['second', '2nd'],
        tts: 'The printer on the second floor is broken, please use the one downstairs.',
        explanation: '"The printer on the second floor is broken."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the caller asking for?',
        options: ['A refund', 'The sales division', 'A meeting', 'An invoice'],
        answerKey: 'B',
        tts: 'Could you put me through to the sales division, please?',
        explanation: '"Put me through to..." = sambungkan ke (divisi penjualan).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When is the report due?',
        options: ['Wednesday afternoon', 'Wednesday morning', 'Thursday', 'Friday afternoon'],
        answerKey: 'A',
        tts: 'Please submit the financial report by Wednesday afternoon.',
        explanation: '"...by Wednesday afternoon."',
      },
      {
        type: 'ISIAN',
        prompt: 'The training will be held in room ___.',
        answerKey: 'five',
        acceptedAnswers: ['five', '5'],
        tts: 'The customer service training will be held in room five.',
        explanation: '"...in room five."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Why is Mr. Tanaka calling?',
        options: ['To cancel his order', 'To reschedule his appointment', 'To make a complaint', 'To ask for directions'],
        answerKey: 'B',
        tts: 'Mr. Tanaka is calling to reschedule his appointment to next Monday.',
        explanation: '"...to reschedule his appointment."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does the speaker offer?',
        options: ['To print the report', 'To call back later', 'To email the meeting notes', 'To book a room'],
        answerKey: 'C',
        tts: 'Would you like me to email you the meeting notes?',
        explanation: '"Would you like me to email you the meeting notes?"',
      },
    ],
  },
];

const MAHIR_LESSONS: DemoLesson[] = [
  {
    code: 'PE-301',
    title: 'Kosakata Profesional',
    skill: 'VOCABULARY',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "leverage" mean in a business context?',
        options: ['Memanfaatkan', 'Meminjam', 'Menilai', 'Menolak'],
        answerKey: 'A',
        explanation: '"Leverage" = memanfaatkan sesuatu untuk hasil maksimal. "We can leverage our network."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "feasible" mean?',
        options: ['Menguntungkan', 'Layak dilakukan', 'Berisiko', 'Wajib'],
        answerKey: 'B',
        explanation: '"Feasible" = layak/mungkin dikerjakan. "Is the plan feasible within this budget?"',
      },
      {
        type: 'ISIAN',
        prompt: 'We need to ___ the risks before signing the contract.',
        answerKey: 'assess',
        acceptedAnswers: ['assess', 'evaluate', 'weigh'],
        explanation: 'Menilai risiko = "assess/evaluate the risks".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "stakeholder" mean?',
        options: ['Pemegang saham saja', 'Pesaing bisnis', 'Pemangku kepentingan', 'Penanam modal asing'],
        answerKey: 'C',
        explanation: '"Stakeholder" = semua pihak yang berkepentingan (karyawan, klien, investor, dst.), lebih luas dari "shareholder".',
      },
      {
        type: 'ISIAN',
        prompt: 'The two companies decided to ___ a partnership.',
        answerKey: 'form',
        acceptedAnswers: ['form', 'establish', 'forge'],
        explanation: 'Menjalin kemitraan = "form/establish a partnership".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "streamline" mean?',
        options: ['Menyederhanakan proses', 'Memperluas pasar', 'Menambah staf', 'Menunda proyek'],
        answerKey: 'A',
        explanation: '"Streamline" = membuat proses lebih sederhana dan efisien.',
      },
      {
        type: 'ISIAN',
        prompt: 'Our revenue grew ___ fifteen percent last quarter.',
        answerKey: 'by',
        acceptedAnswers: ['by'],
        explanation: 'Pertumbuhan sebesar X% memakai "by": "grew by fifteen percent".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "contingency plan" mean?',
        options: ['Rencana utama', 'Rencana anggaran', 'Rencana promosi', 'Rencana cadangan'],
        answerKey: 'D',
        explanation: '"Contingency plan" = rencana cadangan bila skenario utama gagal.',
      },
    ],
  },
  {
    code: 'PE-302',
    title: 'Grammar Lanjutan',
    skill: 'GRAMMAR',
    items: [
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'The proposal should have been submitted yesterday',
        explanation: '"Should have been + V3" = seharusnya sudah (pasif) — penyesalan/kritik halus.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"___ the challenges, the team delivered on time."',
        options: ['Despite', 'Although', 'Even', 'However'],
        answerKey: 'A',
        explanation: '"Despite" + frasa benda. "Although" butuh klausa (subjek + kata kerja).',
      },
      {
        type: 'ISIAN',
        prompt: 'The sooner we start, ___ better.',
        answerKey: 'the',
        acceptedAnswers: ['the'],
        explanation: 'Pola komparatif ganda: "the sooner ..., the better".',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'Should you have any questions please contact us',
        explanation: 'Inversi formal: "Should you ..." = "If you should ..." — lazim di surat bisnis.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"By next year, we ___ the new system."',
        options: ['will have implemented', 'will implement', 'have implemented', 'implemented'],
        answerKey: 'A',
        explanation: '"By + waktu depan" menuntut future perfect: will have + V3.',
      },
      {
        type: 'ISIAN',
        prompt: 'He suggested ___ the launch until the third quarter.',
        answerKey: 'postponing',
        acceptedAnswers: ['postponing', 'delaying'],
        explanation: '"Suggest" diikuti gerund (-ing), bukan to-infinitive.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat berikut:',
        answerKey: 'The results were better than we had expected',
        explanation: 'Past perfect ("had expected") untuk ekspektasi yang terjadi sebelum hasilnya.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"The manager insisted that the report ___ revised."',
        options: ['be', 'is', 'was', 'were'],
        answerKey: 'A',
        explanation: 'Subjunctive setelah "insist/suggest/demand that": kata kerja bentuk dasar — "that the report be revised".',
      },
    ],
  },
  {
    code: 'PE-303',
    title: 'Membaca Teks Bisnis',
    skill: 'READING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'How many remote days are allowed per week?',
        options: ['Two', 'Five', 'Three', 'Four'],
        answerKey: 'C',
        passage:
          'MEMO: Starting next quarter, employees may work remotely up to three days per week, provided that core meetings are attended in person. Department heads will review arrangements monthly, and the policy will be evaluated after six months.',
        explanation: '"...up to three days per week."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What condition applies to remote work?',
        options: ['No meetings allowed', 'Core meetings attended in person', 'Weekly reports required', 'Daily manager approval'],
        answerKey: 'B',
        passage:
          'MEMO: Starting next quarter, employees may work remotely up to three days per week, provided that core meetings are attended in person. Department heads will review arrangements monthly, and the policy will be evaluated after six months.',
        explanation: '"...provided that core meetings are attended in person."',
      },
      {
        type: 'ISIAN',
        prompt: 'The policy will be evaluated after ___ months.',
        answerKey: 'six',
        acceptedAnswers: ['six', '6'],
        passage:
          'MEMO: Starting next quarter, employees may work remotely up to three days per week, provided that core meetings are attended in person. Department heads will review arrangements monthly, and the policy will be evaluated after six months.',
        explanation: '"...evaluated after six months."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What improved after the loyalty program launched?',
        options: ['Acquisition costs', 'Customer retention', 'Staff morale', 'Product quality'],
        answerKey: 'B',
        passage:
          'Our latest survey indicates that customer retention improved significantly after the loyalty program launched. However, acquisition costs rose by 20 percent, suggesting we should rebalance the marketing budget toward retention channels.',
        explanation: '"...customer retention improved significantly..."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does the report suggest?',
        options: ['Cutting the loyalty program', 'Hiring more staff', 'Rebalancing the marketing budget', 'Raising prices'],
        answerKey: 'C',
        passage:
          'Our latest survey indicates that customer retention improved significantly after the loyalty program launched. However, acquisition costs rose by 20 percent, suggesting we should rebalance the marketing budget toward retention channels.',
        explanation: '"...we should rebalance the marketing budget toward retention channels."',
      },
      {
        type: 'ISIAN',
        prompt: 'Acquisition costs rose by ___ percent.',
        answerKey: '20',
        acceptedAnswers: ['20', 'twenty'],
        passage:
          'Our latest survey indicates that customer retention improved significantly after the loyalty program launched. However, acquisition costs rose by 20 percent, suggesting we should rebalance the marketing budget toward retention channels.',
        explanation: '"...acquisition costs rose by 20 percent."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What has the board approved?',
        options: ['A merger', 'Market expansion', 'A new product', 'Budget cuts'],
        answerKey: 'B',
        passage:
          'Dear Ms. Rahma, Following our discussion, I am pleased to confirm that the board has approved the expansion into the Vietnamese market, effective January. A cross-functional team will be assembled next month to oversee the transition.',
        explanation: '"...approved the expansion into the Vietnamese market."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When will the team be assembled?',
        options: ['Effective January', 'Next month', 'Next quarter', 'Immediately'],
        answerKey: 'B',
        passage:
          'Dear Ms. Rahma, Following our discussion, I am pleased to confirm that the board has approved the expansion into the Vietnamese market, effective January. A cross-functional team will be assembled next month to oversee the transition.',
        explanation: '"A cross-functional team will be assembled next month..." (Januari = mulai berlakunya ekspansi.)',
      },
    ],
  },
  {
    code: 'PE-304',
    title: 'Menyimak Profesional',
    skill: 'LISTENING',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the main topic of the briefing?',
        options: ['A staff party', 'Quarterly results and strategy', 'A new office', 'Hiring plans'],
        answerKey: 'B',
        tts: 'This morning we will review the quarterly results and discuss our strategy for the coming year.',
        explanation: '"...review the quarterly results and discuss our strategy."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What caused the delay?',
        options: ['Budget cuts', 'Staff shortage', 'Supply chain issues', 'Software bugs'],
        answerKey: 'C',
        tts: 'The product launch was delayed due to unexpected supply chain issues.',
        explanation: '"...due to unexpected supply chain issues."',
      },
      {
        type: 'ISIAN',
        prompt: 'Profits increased by ___ percent this quarter.',
        answerKey: 'twelve',
        acceptedAnswers: ['twelve', '12'],
        tts: 'I am pleased to report that profits increased by twelve percent this quarter.',
        explanation: '"...increased by twelve percent."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does the speaker recommend?',
        options: ['A hiring freeze', 'Investing in employee training', 'Reducing salaries', 'Outsourcing support'],
        answerKey: 'B',
        tts: 'I recommend investing more in employee training to reduce turnover.',
        explanation: '"I recommend investing more in employee training..."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'When will the merger be announced?',
        options: ['Next week', 'At the end of the fiscal year', 'Tomorrow morning', 'In two years'],
        answerKey: 'B',
        tts: 'The merger will be announced officially at the end of the fiscal year.',
        explanation: '"...at the end of the fiscal year."',
      },
      {
        type: 'ISIAN',
        prompt: 'The keynote speech lasted ___ minutes.',
        answerKey: 'forty',
        acceptedAnswers: ['forty', '40'],
        tts: 'The keynote speech lasted forty minutes, followed by a panel discussion.',
        explanation: '"...lasted forty minutes."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the purpose of the call?',
        options: ['To cancel a contract', 'To follow up on a proposal', 'To schedule an interview', 'To request a refund'],
        answerKey: 'B',
        tts: 'I am calling to follow up on the proposal we sent last week.',
        explanation: '"...to follow up on the proposal."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What should attendees do before the workshop?',
        options: ['Prepare a presentation', 'Bring their laptops', 'Read the case study', 'Sign a form'],
        answerKey: 'C',
        tts: 'Please read the case study before attending the workshop.',
        explanation: '"Please read the case study before attending..."',
      },
    ],
  },
];

const MODULES: DemoModule[] = [
  { topic: 'Daily Conversation', level: 'DASAR', cefr: 'A2', lessons: DASAR_LESSONS },
  { topic: 'Workplace Communication', level: 'MENENGAH', cefr: 'B1', lessons: MENENGAH_LESSONS },
  { topic: 'Professional English', level: 'MAHIR', cefr: 'C1', lessons: MAHIR_LESSONS },
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

/** Tujuan penyimpanan audio — cermin kecil dari driver storage BE. */
type AudioStore = {
  label: string;
  exists(name: string): Promise<boolean>;
  putFile(name: string, localPath: string): Promise<void>;
  put(name: string, buf: Buffer): Promise<void>;
};

function audioContentType(name: string): string {
  return name.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav';
}

function makeAudioStore(): AudioStore {
  if (process.env.STORAGE_DRIVER === 'minio') {
    const bucket = process.env.MINIO_BUCKET ?? '';
    const client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? '',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL !== 'false',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
    });
    return {
      label: `bucket MinIO "${bucket}"`,
      exists: (name) =>
        client.statObject(bucket, name).then(
          () => true,
          () => false,
        ),
      putFile: async (name, localPath) => {
        await client.fPutObject(bucket, name, localPath, {
          'Content-Type': audioContentType(name),
        });
      },
      put: async (name, buf) => {
        await client.putObject(bucket, name, buf, buf.length, {
          'Content-Type': audioContentType(name),
        });
      },
    };
  }
  return {
    label: `direktori "${STORAGE_DIR}"`,
    exists: async (name) => existsSync(path.join(STORAGE_DIR, name)),
    putFile: async (name, localPath) => {
      mkdirSync(STORAGE_DIR, { recursive: true });
      const target = path.join(STORAGE_DIR, name);
      if (path.resolve(localPath) !== path.resolve(target))
        copyFileSync(localPath, target);
    },
    put: async (name, buf) => {
      mkdirSync(STORAGE_DIR, { recursive: true });
      writeFileSync(path.join(STORAGE_DIR, name), buf);
    },
  };
}

/** Buat/temukan file audio untuk satu frasa; return nama file di storage. */
async function makeAudio(
  baseName: string,
  text: string,
  useTts: boolean,
  store: AudioStore,
): Promise<string> {
  const m4aName = `${baseName}.m4a`;
  // Audio asli yang sudah ada di storage tujuan selalu menang — termasuk
  // .m4a hasil TTS Mac yang diunggah lebih dulu ke bucket staging.
  if (await store.exists(m4aName)) return m4aName;
  if (useTts) {
    mkdirSync(STORAGE_DIR, { recursive: true });
    const local = path.join(STORAGE_DIR, m4aName);
    if (!existsSync(local)) {
      const aiff = path.join(STORAGE_DIR, `${baseName}.aiff`);
      // Samantha = suara en-US default yang tersedia luas; rate sedikit pelan
      // agar ramah pembelajar.
      execFileSync('say', ['-v', 'Samantha', '-r', '150', '-o', aiff, text]);
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, local]);
      execFileSync('rm', ['-f', aiff]);
    }
    await store.putFile(m4aName, local);
    return m4aName;
  }
  const wavName = `${baseName}.wav`;
  if (!(await store.exists(wavName))) await store.put(wavName, silentWav());
  return wavName;
}

async function main() {
  const useTts = hasMacTts();
  const store = makeAudioStore();
  if (!useTts) {
    console.warn(
      `⚠ TTS macOS (say/afconvert) tidak tersedia — memakai .m4a yang sudah ada di ${store.label}; sisanya WAV senyap.`,
    );
  }

  for (const mod of MODULES) {
    // urutan lesson: lanjut dari max(order) level modul ini (pola importer)
    const maxOrder = await prisma.lesson.aggregate({
      where: { level: mod.level },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? 0) + 1;

    let lessonsUpserted = 0;
    let itemsUpserted = 0;
    let audioFiles = 0;
    let audioSilent = 0;

    for (const dl of mod.lessons) {
      const existing = await prisma.lesson.findUnique({ where: { code: dl.code } });
      const lesson = existing
        ? await prisma.lesson.update({
            where: { id: existing.id },
            data: { title: dl.title, topic: mod.topic, level: mod.level, cefr: mod.cefr, skill: dl.skill, status: 'LIVE' },
          })
        : await prisma.lesson.create({
            data: {
              code: dl.code,
              title: dl.title,
              topic: mod.topic,
              level: mod.level,
              cefr: mod.cefr,
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
          mediaFile = await makeAudio(
            `${dl.code.toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
            it.tts,
            useTts,
            store,
          );
          audioFiles++;
          if (mediaFile.endsWith('.wav')) audioSilent++;
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

    const audioNote =
      audioSilent === 0
        ? 'm4a'
        : `${audioFiles - audioSilent} m4a + ${audioSilent} wav senyap`;
    console.log(
      `✔ Demo module "${mod.topic}" (${mod.level}/${mod.cefr}): ${lessonsUpserted} lesson, ${itemsUpserted} soal, ${audioFiles} audio (${audioNote}) — semua LIVE.`,
    );
  }
  console.log('  Ganti level di Profil untuk melihat modul level lain.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
