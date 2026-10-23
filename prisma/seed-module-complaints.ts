// apps/api/prisma/seed-module-complaints.ts
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { parseChapter } from '../src/modules/chapter-parser';

/**
 * Seed KONTEN — modul "Making & Handling Complaints" (MENENGAH·B1).
 * 11 bab, bab n menautkan lesson CMP-2xx yang dibuat seed-complaints.ts
 * (jalankan itu dulu). Lesson CMP tampil di Perjalanan sebagai unit modul
 * (spec satu-perjalanan; migrasi 20261023 menaruhnya di akhir MENENGAH). Ungkapan diadaptasi dari modul SKKNI BHS.IS03.004.01;
 * penjelasan & dialog ditulis ulang untuk konteks kerja umum, tidak disalin.
 *
 * Jalankan: `npm run seed:module-complaints`. CREATE-ONLY: modul (by slug) dan
 * bab (by moduleId+order) yang sudah ada dilewati — edit admin aman.
 */

const prisma = new PrismaClient();
const SLUG = 'making-handling-complaints';

type Ch = { code: string; title: string; estMinutes: number; body: string };

const CHAPTERS: Ch[] = [
  {
    code: 'CMP-201',
    title: 'Kosakata Keluhan',
    estMinutes: 5,
    body: `Keluhan muncul di mana saja: barang dari vendor terlambat, laptop kantor rusak, atau laporan yang salah angka. Kenali dulu kata-kata intinya.

## Kata kunci

:::phrases
- complaint | keluhan (kata benda)
- to complain about something | mengeluhkan sesuatu
- faulty | rusak, tidak berfungsi
- delay | keterlambatan
- refund | pengembalian dana
- replacement | penggantian (barang)
- inconvenience | ketidaknyamanan
- to resolve | menyelesaikan (masalah)
:::

:::tip
**complain** adalah kata kerja, **complaint** kata benda: *I want to complain* — *I have a complaint*.
:::

## Dalam percakapan

:::dialog
Sari (Admin Kantor): The new printer is faulty again.
Kamu (IT Support): Sorry for the inconvenience. I'll arrange a replacement.
:::`,
  },
  {
    code: 'CMP-202',
    title: 'Menyampaikan Keluhan & Harapan',
    estMinutes: 5,
    body: `Keluhan yang baik punya dua bagian: **apa masalahnya** dan **apa yang kamu harapkan**. Tanpa harapan, lawan bicara tidak tahu harus berbuat apa.

## Membuka keluhan

:::phrases
- I'd like to make a complaint about… | Saya ingin menyampaikan keluhan tentang…
- I'm not happy with… | Saya kurang puas dengan…
- I'm afraid there's a problem with… | Sepertinya ada masalah dengan…
:::

## Menyampaikan harapan

:::phrases
- I would appreciate it if you could… | Saya akan sangat berterima kasih jika Anda bisa…
- Could you please look into it? | Bisakah Anda menindaklanjutinya?
- I'd like it to be fixed by Friday. | Saya ingin ini diperbaiki paling lambat Jumat.
:::

:::dialog
Dimas (Procurement): I'm afraid there's a problem with the last delivery. Two boxes are missing.
Vendor: I see. What would you like us to do?
Dimas (Procurement): I would appreciate it if you could send them by Thursday.
:::`,
  },
  {
    code: 'CMP-203',
    title: 'Bahasa Formal vs Nonformal',
    estMinutes: 4,
    body: `Saat kesal, kalimat cenderung jadi pendek dan kasar. Di kantor, versi formal membuat keluhan lebih didengar.

| Nonformal | Formal |
|---|---|
| This is wrong. | I'm afraid there seems to be an error. |
| Fix it now. | Could you please fix it as soon as possible? |
| What's the problem? | How may I help you? |
| Wait. | Could you hold on for a moment, please? |
| You didn't send it. | It seems the file hasn't arrived yet. |

:::tip
Kata **seems**, **I'm afraid**, dan **could you** melunakkan kalimat tanpa mengubah isinya.
:::`,
  },
  {
    code: 'CMP-204',
    title: 'Menggali Informasi',
    estMinutes: 5,
    body: `Sebelum menyelesaikan keluhan, kamu perlu tahu detailnya. Gunakan pertanyaan yang sopan dan spesifik.

## Frasa kunci

:::phrases
- Could you tell me what happened? | Boleh ceritakan apa yang terjadi?
- When did you first notice it? | Kapan pertama kali Anda menyadarinya?
- May I have the order number? | Boleh saya minta nomor pesanannya?
- Has this happened before? | Apakah ini pernah terjadi sebelumnya?
:::

:::tip
"Could you…" terdengar lebih sopan daripada "Can you…" saat bicara dengan pelanggan atau atasan.
:::

## Contoh percakapan

:::dialog
Rina (Finance): The vendor invoice still shows the wrong amount.
Kamu (IT Support): I'm sorry about that. Could you tell me which invoice number it is?
Rina (Finance): It's INV-2047, from last Monday.
Kamu (IT Support): Thank you. When did you first notice the difference?
:::`,
  },
  {
    code: 'CMP-205',
    title: 'Minta Maaf & Empati',
    estMinutes: 5,
    body: `Permintaan maaf yang tulus meredakan suasana, bahkan sebelum masalahnya selesai. Tunjukkan bahwa kamu memahami perasaan lawan bicara.

:::phrases
- I'm very sorry for the inconvenience. | Mohon maaf atas ketidaknyamanannya.
- I apologize for the delay. | Saya mohon maaf atas keterlambatannya.
- I understand how frustrating this must be. | Saya paham ini pasti membuat kesal.
- That must have been difficult. | Itu pasti tidak mudah.
:::

:::tip
Hindari menyalahkan pihak lain ("It's the courier's fault"). Fokus pada apa yang bisa kamu lakukan.
:::

:::dialog
Budi (Sales): I waited two hours for the meeting room to be ready.
Kamu (General Affairs): I'm very sorry for the inconvenience. I understand how frustrating that must be.
:::`,
  },
  {
    code: 'CMP-206',
    title: 'Berterima Kasih atas Masukan',
    estMinutes: 4,
    body: `Orang yang mengeluh sebenarnya memberi informasi berharga. Ucapkan terima kasih — itu membuat mereka merasa didengar.

:::phrases
- Thank you for letting us know. | Terima kasih sudah memberi tahu kami.
- Thanks for bringing this to our attention. | Terima kasih sudah menyampaikan hal ini.
- We appreciate your feedback. | Kami menghargai masukan Anda.
- Thank you for your patience. | Terima kasih atas kesabaran Anda.
:::

:::tip
Ucapkan terima kasih di awal **dan** di akhir percakapan — pembuka yang hangat, penutup yang rapi.
:::`,
  },
  {
    code: 'CMP-207',
    title: 'Menjanjikan Tindakan',
    estMinutes: 5,
    body: `Setelah minta maaf, sampaikan langkah konkret. Janji yang baik menjawab **apa** yang akan dilakukan dan **kapan**.

:::phrases
- I'll look into it right away. | Saya akan segera memeriksanya.
- Let me check with the team. | Saya cek dulu dengan tim.
- I'll get back to you by 3 p.m. | Saya akan mengabari Anda paling lambat pukul 3 sore.
- We will replace it free of charge. | Kami akan menggantinya tanpa biaya.
:::

:::tip
"I'll try" terdengar ragu. Pilih "I will…" bila kamu yakin bisa menepatinya.
:::

:::dialog
Maya (HR): My access card stopped working this morning.
Kamu (Security): Let me check with the team. I'll get back to you by noon.
:::`,
  },
  {
    code: 'CMP-208',
    title: 'Konfirmasi Penyelesaian',
    estMinutes: 4,
    body: `Keluhan belum selesai sampai pelapor setuju masalahnya beres. Tutup dengan konfirmasi.

:::phrases
- Is everything working now? | Apakah semuanya sudah berjalan normal?
- Has the issue been resolved? | Apakah masalahnya sudah selesai?
- Is there anything else I can help with? | Ada lagi yang bisa saya bantu?
- Please let me know if it happens again. | Kabari saya jika terjadi lagi.
:::

:::dialog
Kamu (IT Support): I've reset your account. Is everything working now?
Andi (Marketing): Yes, I can log in. Thanks!
Kamu (IT Support): Great. Please let me know if it happens again.
:::`,
  },
  {
    code: 'CMP-209',
    title: 'Email Keluhan & Balasannya',
    estMinutes: 6,
    body: `Keluhan tertulis perlu struktur yang jelas supaya cepat ditindaklanjuti.

## Struktur email keluhan

1. Subjek yang spesifik
2. Masalahnya dalam satu kalimat
3. Detail: tanggal, nomor dokumen, dampak
4. Harapanmu
5. Penutup sopan

:::phrases
- I am writing to complain about… | Saya menulis untuk menyampaikan keluhan tentang…
- Please find attached… | Terlampir…
- I look forward to your reply. | Saya menantikan balasan Anda.
- Thank you for your email regarding… | Terima kasih atas email Anda terkait…
:::

:::tip
Subjek seperti **"Wrong amount on invoice INV-2047"** jauh lebih berguna daripada **"Complaint"**.
:::`,
  },
  {
    code: 'CMP-210',
    title: 'Menangani Keluhan lewat Telepon',
    estMinutes: 5,
    body: `Di telepon kamu tidak bisa melihat ekspresi lawan bicara. Bicara pelan, jelas, dan ulangi informasi penting.

:::phrases
- Thank you for calling IT Support, this is Dewi speaking. | Terima kasih telah menghubungi IT Support, dengan Dewi di sini.
- Could you hold the line, please? | Mohon ditunggu sebentar.
- Sorry, could you repeat that? | Maaf, bisa diulang?
- Could you spell your name, please? | Bisa dieja namanya?
:::

:::tip
Ulangi angka penting untuk konfirmasi: *"That's INV two-zero-four-seven, correct?"*
:::

:::dialog
Kamu (IT Support): Thank you for calling IT Support, this is Dewi speaking.
Penelepon: Hi, my email has stopped syncing since yesterday.
Kamu (IT Support): I'm sorry to hear that. Could you spell your name, please?
:::`,
  },
  {
    code: 'CMP-211',
    title: 'Ucapkan: Menangani Keluhan',
    estMinutes: 5,
    body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- I'm very sorry for the inconvenience. | Mohon maaf atas ketidaknyamanannya.
- Could you tell me what happened? | Boleh ceritakan apa yang terjadi?
- I'll look into it right away. | Saya akan segera memeriksanya.
- Is there anything else I can help with? | Ada lagi yang bisa saya bantu?
:::

:::tip
Ucapkan perlahan dan beri jeda di koma — kejelasan lebih penting daripada kecepatan.
:::`,
  },
];

async function main() {
  // Validasi semua body dulu — gagal keras sebelum menulis apa pun.
  const parsed = CHAPTERS.map((c) => {
    const r = parseChapter(c.body);
    if (!r.ok)
      throw new Error(
        `${c.code}: ${r.errors.map((e) => `Baris ${e.line}: ${e.message}`).join('; ')}`,
      );
    if (r.media.length)
      throw new Error(`${c.code}: seeder ini tidak memakai media`);
    return r.blocks;
  });

  let mod = await prisma.module.findUnique({ where: { slug: SLUG } });
  if (!mod) {
    const max = await prisma.module.aggregate({ _max: { order: true } });
    mod = await prisma.module.create({
      data: {
        slug: SLUG,
        title: 'Making & Handling Complaints',
        summary:
          'Menyampaikan keluhan dengan sopan dan menanganinya sampai tuntas.',
        level: 'MENENGAH',
        cefr: 'B1',
        order: (max._max.order ?? 0) + 1,
        status: 'LIVE',
      },
    });
    console.log(`Modul dibuat: ${mod.title}`);
  } else {
    console.log(`Modul sudah ada, dilewati: ${mod.title}`);
  }

  let created = 0;
  for (const [idx, c] of CHAPTERS.entries()) {
    const order = idx + 1;
    const exists = await prisma.moduleChapter.findUnique({
      where: { moduleId_order: { moduleId: mod.id, order } },
    });
    if (exists) continue;
    const lesson = await prisma.lesson.findUnique({
      where: { code: c.code },
      include: { moduleChapter: true },
    });
    let lessonId: string | null = null;
    if (!lesson)
      console.warn(
        `  ! ${c.code} tidak ditemukan — bab ${order} jadi Bacaan (jalankan seed:complaints dulu)`,
      );
    else if (lesson.moduleChapter)
      console.warn(`  ! ${c.code} sudah dipakai bab lain — tidak ditautkan`);
    else lessonId = lesson.id;
    await prisma.moduleChapter.create({
      data: {
        moduleId: mod.id,
        order,
        title: c.title,
        estMinutes: c.estMinutes,
        body: c.body,
        blocks: parsed[idx] as unknown as Prisma.InputJsonValue,
        lessonId,
      },
    });
    created += 1;
  }
  console.log(`${created} bab baru.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
