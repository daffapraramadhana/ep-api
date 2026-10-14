import 'dotenv/config';
import { PrismaClient, ItemType, Cefr, SkillTag } from '@prisma/client';
import { hasMacTts, makeAudio, makeAudioStore } from './seed-audio';

/**
 * Seed KONTEN — topik "Complaints at Work" (MENENGAH, CMP-201..211).
 * Diadaptasi dari modul pelatihan SKKNI BHS.IS03.004.01 "Membuat dan
 * Menangani Keluhan" (2023): ungkapan & grammar diambil dari modul,
 * skenario dibuat ulang ke konteks kerja umum (vendor, helpdesk, divisi
 * lain) — bukan contact center saja. Teks dialog/email modul tidak disalin.
 *
 * Alur unit: kosakata → menyampaikan keluhan → bahasa formal → menggali
 * informasi → minta maaf & empati → terima kasih → janji tindakan →
 * konfirmasi penyelesaian → email (reading) → telepon (listening) → ucapan.
 *
 * Jalankan manual: `npm run seed:complaints`. Langsung LIVE.
 * Rerun = CREATE-ONLY: lesson (by code) dan soal (by lessonId+order) yang
 * sudah ada DILEWATI, tidak ditimpa — supaya edit/retire dari admin klien
 * tetap aman. Konsekuensinya: koreksi teks di file ini TIDAK merambat ke
 * soal yang sudah ter-seed; perbaiki lewat admin. Soal baru (order baru)
 * di lesson yang sudah ada tetap ditambahkan.
 *
 * Audio listening (CMP-210): TTS macOS, sama dengan seed-demo.
 */

const prisma = new PrismaClient();

const TOPIC = 'Complaints at Work';
const LEVEL = 'MENENGAH' as const;

type Item = {
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

type Lesson = {
  code: string;
  title: string;
  skill: SkillTag;
  cefr: Cefr;
  items: Item[];
};

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const EMAIL_COMPLAINT = `Dear Mr. Hadi,

I am writing to complain about our order of printer paper (order no. 4471). We placed the order on May 2 and you promised delivery no later than May 5, but the boxes did not arrive until May 9. In addition, three of the ten boxes were wet and cannot be used.

I would like you to replace the three damaged boxes this week. Attached are photos of the boxes and the delivery note.

I look forward to hearing from you soon.

Sincerely,
Rina Putri
Office Administration`;

const EMAIL_REPLY = `Dear Ms. Putri,

I am writing with regard to your recent email about order no. 4471. Thank you for bringing this to our attention, and please accept our apologies for the inconvenience caused. The delay was due to a problem with our delivery truck.

We will send three new boxes to your office on Thursday at no extra cost. Should you need any further information, please do not hesitate to contact us.

Yours sincerely,
Hadi Santoso
Customer Service, Mitra Kertas`;

const LESSONS: Lesson[] = [
  {
    code: 'CMP-201',
    title: 'Kosakata Keluhan',
    skill: 'VOCABULARY',
    cefr: 'A2',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "refund" mean?',
        options: ['Pengembalian dana', 'Potongan harga', 'Biaya tambahan', 'Tagihan'],
        answerKey: 'A',
        explanation: '"Refund" = pengembalian dana. "I would like a full refund."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "inconvenience" mean?',
        options: ['Keuntungan', 'Ketidaknyamanan', 'Keterlambatan', 'Kerusakan'],
        answerKey: 'B',
        explanation: '"Inconvenience" = ketidaknyamanan. Sering dipakai: "I apologize for the inconvenience."',
      },
      {
        type: 'ISIAN',
        prompt: 'The package arrived two weeks late. The ___ was very slow.',
        answerKey: 'delivery',
        acceptedAnswers: ['delivery', 'shipping', 'shipment'],
        explanation: '"Delivery" = pengiriman. "Late delivery" = pengiriman terlambat.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which complaint is about a broken product?',
        options: [
          'The staff at the front desk was rude.',
          'The meeting room was booked twice.',
          'The printer stopped working yesterday.',
          'The traffic made me late.',
        ],
        answerKey: 'C',
        explanation: 'Keluhan mekanikal = alat/produk tidak berfungsi, seperti printer yang mati.',
      },
      {
        type: 'ISIAN',
        prompt: 'The IT team will send a ___ to fix your laptop.',
        answerKey: 'technician',
        acceptedAnswers: ['technician', 'repairman', 'repair person'],
        explanation: '"Technician" = teknisi, orang yang memperbaiki alat.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "issue" mean in "We are checking the issue now"?',
        options: ['Terbitan', 'Surat', 'Masalah', 'Berita'],
        answerKey: 'C',
        explanation: 'Dalam konteks keluhan, "issue" = masalah — lebih formal daripada "problem".',
      },
      {
        type: 'ISIAN',
        prompt: 'Please write the ticket ___ in your email so we can track your case.',
        answerKey: 'number',
        acceptedAnswers: ['number', 'ID'],
        explanation: '"Ticket number" / "ticket ID" = nomor tiket untuk melacak keluhan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does "follow up" mean?',
        options: ['Membatalkan', 'Menindaklanjuti', 'Menolak', 'Mengikuti dari belakang'],
        answerKey: 'B',
        explanation: '"Follow up" = menindaklanjuti. "I will follow up on your complaint."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which one is a WRITTEN channel for a complaint?',
        options: ['Phone call', 'Video call', 'Face-to-face meeting', 'Email'],
        answerKey: 'D',
        explanation: 'Media tertulis: email, live chat, media sosial. Media lisan: telepon, tatap muka.',
      },
    ],
  },
  {
    code: 'CMP-202',
    title: 'Menyampaikan Keluhan & Harapan',
    skill: 'VOCABULARY',
    cefr: 'A2',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'You want to complain politely to a supplier. What do you say?',
        options: [
          'This is a stupid mistake.',
          "I'd like to make a complaint about the last order.",
          'Your company is terrible.',
          'Give me my money back now.',
        ],
        answerKey: 'B',
        explanation: '"I\'d like to make a complaint about…" = cara sopan membuka keluhan.',
      },
      {
        type: 'ISIAN',
        prompt: 'Excuse me, but there ___ to be a problem with my access card.',
        answerKey: 'seems',
        acceptedAnswers: ['seems', 'appears'],
        explanation: '"There seems/appears to be a problem…" = sepertinya ada masalah. Halus, tidak menuduh.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I have a complaint to make',
        explanation: '"I have a complaint to make." = Saya punya keluhan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which sentence asks for a solution politely?',
        options: [
          'Fix it now.',
          'You must give me a new chair.',
          'Why is this chair broken?',
          'Would you please replace the broken chair?',
        ],
        answerKey: 'D',
        explanation: '"Would you please…?" = permintaan sopan untuk penyelesaian.',
      },
      {
        type: 'ISIAN',
        prompt: 'I was ___ the invoice last week, but it has not arrived yet.',
        answerKey: 'expecting',
        explanation: '"I was expecting (something), but…" = saya mengharapkan…, namun…',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"I would like a full refund." Apa maksudnya?',
        options: [
          'Saya ingin pengembalian dana penuh',
          'Saya ingin membayar penuh',
          'Saya ingin diskon',
          'Saya ingin membatalkan pesanan',
        ],
        answerKey: 'A',
        explanation: '"I would like…" = menyampaikan harapan penyelesaian. "Full refund" = uang kembali penuh.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Do you think you could check it today',
        explanation: '"Do you think you could…?" = Apakah menurut Anda, Anda bisa…? Permintaan yang halus.',
      },
      {
        type: 'ISIAN',
        prompt: 'I would like you to ___ this matter. (menyelidiki)',
        answerKey: 'investigate',
        acceptedAnswers: ['investigate', 'look into', 'check'],
        explanation: '"I would like you to investigate this matter." = Saya berharap Anda menyelidiki hal ini.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which sentence is NOT polite?',
        options: [
          'There appears to be something wrong with my payslip.',
          'Excuse me, but I am really not happy with the service.',
          'This is your fault, so fix it.',
          "I'm afraid I'd like to complain about the noise.",
        ],
        answerKey: 'C',
        explanation: 'Keluhan tetap harus sopan. "This is your fault" menyalahkan langsung.',
      },
    ],
  },
  {
    code: 'CMP-203',
    title: 'Bahasa Formal vs Nonformal',
    skill: 'VOCABULARY',
    cefr: 'B1',
    items: [
      {
        type: 'ISIAN',
        prompt: 'We need to ___ new laptops for the team. (buy → formal)',
        answerKey: 'purchase',
        explanation: '"Buy" (nonformal) → "purchase" (formal).',
      },
      {
        type: 'ISIAN',
        prompt: 'Could you ___ me with this request? (help → formal)',
        answerKey: 'assist',
        explanation: '"Help" (nonformal) → "assist" (formal).',
      },
      {
        type: 'ISIAN',
        prompt: 'Please ___ your account details before you continue. (check → formal)',
        answerKey: 'verify',
        explanation: '"Check" (nonformal) → "verify" (formal).',
      },
      {
        type: 'ISIAN',
        prompt: 'I will ___ you as soon as the issue is fixed. (tell → formal)',
        answerKey: 'inform',
        explanation: '"Tell" (nonformal) → "inform" (formal).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the formal word for "maybe"?',
        options: ['Kinda', 'Perhaps', 'Sure', 'Probably not'],
        answerKey: 'B',
        explanation: '"Maybe" (nonformal) → "perhaps" (formal).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which sentence is the most formal?',
        options: [
          "I'm gonna check your account.",
          'Lemme check your account.',
          'Gonna check it, okay?',
          'I am going to check your account.',
        ],
        answerKey: 'D',
        explanation: 'Hindari slang ("gonna", "lemme") dan singkatan dalam komunikasi resmi.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which response is the most formal?',
        options: [
          'I do apologize that you are having this issue.',
          "I'm sorry you're having this problem.",
          'Sorry about that.',
          'My bad.',
        ],
        answerKey: 'A',
        explanation: '"I apologize" lebih formal dari "I\'m sorry"; "issue" lebih formal dari "problem".',
      },
      {
        type: 'ISIAN',
        prompt: 'The meeting was ___ until next Monday. (put off → formal)',
        answerKey: 'postponed',
        acceptedAnswers: ['postponed', 'delayed'],
        explanation: '"Put off" (nonformal) → "postpone" (formal). Bentuk pasif: was postponed.',
      },
      {
        type: 'ISIAN',
        prompt: 'The delay was ___ heavy rain. (because of → formal)',
        answerKey: 'due to',
        acceptedAnswers: ['due to', 'owing to'],
        explanation: '"Because of" (nonformal) → "due to" (formal).',
      },
    ],
  },
  {
    code: 'CMP-204',
    title: 'Menggali Informasi',
    skill: 'GRAMMAR',
    cefr: 'B1',
    items: [
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Could you tell me exactly what happened',
        explanation: 'Pertanyaan tidak langsung: "Could you tell me + what happened" (tanpa "did").',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Could you tell me a little more about it',
        explanation: '"Could you tell me a little more about it?" = minta detail tambahan (probing).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'A colleague says, "The system is broken." You need more details. What do you ask?',
        options: [
          'Why did you break it?',
          'Could you clarify what you mean by "broken"?',
          'That is not my problem.',
          'Broken how, huh?',
        ],
        answerKey: 'B',
        explanation: '"Could you clarify what you mean by…?" = minta penjelasan dengan sopan.',
      },
      {
        type: 'ISIAN',
        prompt: 'Could you ___ what you mean when you say "slow"?',
        answerKey: 'clarify',
        acceptedAnswers: ['clarify', 'explain'],
        explanation: '"Clarify" = memperjelas.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Choose the correct question.',
        options: [
          'Could you tell me what did happen?',
          'Could you told me what happened?',
          'Could you tell me what happened?',
          'Could you tell me what happened did?',
        ],
        answerKey: 'C',
        explanation: 'Setelah "Could you tell me…", susunannya seperti kalimat biasa: "what happened" — tanpa "did".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Could you tell me ___?',
        options: [
          'when did the problem start',
          'when the problem started',
          'when started the problem',
          'when does the problem started',
        ],
        answerKey: 'B',
        explanation: 'Pertanyaan tidak langsung: kata tanya + subjek + kata kerja → "when the problem started".',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I would like to summarize the situation',
        explanation: 'Merangkum keluhan memastikan kita memahaminya dengan benar.',
      },
      {
        type: 'ISIAN',
        prompt: 'May I ___ your employee ID, please?',
        answerKey: 'have',
        acceptedAnswers: ['have', 'know', 'get'],
        explanation: '"May I have your…, please?" = cara sopan meminta data.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I will make a few notes as you speak',
        explanation: '"I will make a few notes as you speak." = Saya akan mencatat selagi Anda berbicara.',
      },
    ],
  },
  {
    code: 'CMP-205',
    title: 'Minta Maaf & Empati',
    skill: 'VOCABULARY',
    cefr: 'B1',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'A client says their order arrived damaged. What is the best response?',
        options: [
          "That is the courier's fault, not ours.",
          'You should have checked it first.',
          'Things like that happen.',
          'I really apologize for the inconvenience.',
        ],
        answerKey: 'D',
        explanation: 'Respons positif: minta maaf, tidak menyalahkan pihak lain atau pelanggan.',
      },
      {
        type: 'ISIAN',
        prompt: 'I apologize ___ the inconvenience.',
        answerKey: 'for',
        explanation: 'Polanya "apologize for + sesuatu".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which response shows empathy?',
        options: [
          'I understand how frustrating that must have been.',
          'Please calm down.',
          'This is not a big deal.',
          'Everyone has this problem.',
        ],
        answerKey: 'A',
        explanation: 'Empati = menunjukkan kita memahami perasaan lawan bicara.',
      },
      {
        type: 'ISIAN',
        prompt: 'First of all, we sincerely ___ about that.',
        answerKey: 'apologize',
        acceptedAnswers: ['apologize', 'apologise'],
        explanation: '"We sincerely apologize" = Kami sungguh minta maaf.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Kenapa respons "It is your own fault for not being careful." dianggap buruk?',
        options: [
          'Terlalu formal',
          'Menyalahkan lawan bicara dan menolak bertanggung jawab',
          'Terlalu panjang',
          'Tata bahasanya salah',
        ],
        answerKey: 'B',
        explanation: 'Respons negatif menyalahkan pelanggan/pihak lain — keluhan jadi makin buruk.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I am really sorry to hear that',
        explanation: '"I am really sorry to hear that." = Saya turut menyesal mendengarnya.',
      },
      {
        type: 'ISIAN',
        prompt: 'I ___ what you mean. (memahami)',
        answerKey: 'see',
        acceptedAnswers: ['see', 'understand', 'know'],
        explanation: '"I see what you mean." = Saya memahami maksud Anda.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"I would feel the same way." Apa maksudnya?',
        options: [
          'Saya merasa lebih baik',
          'Saya tidak setuju',
          'Saya juga akan merasakan hal yang sama',
          'Saya akan pergi dengan cara yang sama',
        ],
        answerKey: 'C',
        explanation: 'Ungkapan empati: menempatkan diri di posisi lawan bicara.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I appreciate your patience in this matter',
        explanation: '"I appreciate your patience in this matter." = Saya menghargai kesabaran Anda.',
      },
    ],
  },
  {
    code: 'CMP-206',
    title: 'Berterima Kasih atas Masukan',
    skill: 'VOCABULARY',
    cefr: 'B1',
    items: [
      {
        type: 'ISIAN',
        prompt: 'Thanks for bringing that to our ___.',
        answerKey: 'attention',
        explanation: '"Thanks for bringing that to our attention." = Terima kasih sudah memberi tahu kami.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the best first reply to a complaint?',
        options: [
          'Why are you complaining?',
          'Please read the manual.',
          'Thank you for letting us know.',
          'We are busy now.',
        ],
        answerKey: 'C',
        explanation: 'Awali dengan terima kasih — keluhan adalah masukan berharga.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Thank you for sharing your concern',
        explanation: '"Concern" = kekhawatiran/keluhan. Terima kasih sudah menyampaikannya.',
      },
      {
        type: 'ISIAN',
        prompt: 'We ___ your feedback and will use it to improve our service.',
        answerKey: 'value',
        acceptedAnswers: ['value', 'appreciate'],
        explanation: '"We value your feedback" = Kami menghargai masukan Anda.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"Your feedback is valuable for us." Apa maksudnya?',
        options: [
          'Masukan Anda sangat berarti bagi kami',
          'Masukan Anda mahal',
          'Kami akan membayar masukan Anda',
          'Masukan Anda sudah kami terima kemarin',
        ],
        answerKey: 'A',
        explanation: '"Valuable" = berharga/berarti.',
      },
      {
        type: 'ISIAN',
        prompt: 'Thank you so much for reaching ___ and letting us know.',
        answerKey: 'out',
        explanation: '"Reach out" = menghubungi.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Kenapa kita perlu berterima kasih atas sebuah keluhan?',
        options: [
          'Supaya orang berhenti mengeluh',
          'Karena itu aturan wajib',
          'Supaya percakapan cepat selesai',
          'Keluhan memberi masukan untuk memperbaiki layanan',
        ],
        answerKey: 'D',
        explanation: 'Sebagian besar orang yang kecewa diam saja; yang mengeluh memberi kita kesempatan memperbaiki.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Thank you for your valuable feedback',
        explanation: '"Thank you for your valuable feedback." = Terima kasih atas masukan Anda yang berharga.',
      },
    ],
  },
  {
    code: 'CMP-207',
    title: 'Menjanjikan Tindakan',
    skill: 'GRAMMAR',
    cefr: 'B1',
    items: [
      {
        type: 'ISIAN',
        prompt: 'I ___ send a technician to your office this afternoon.',
        answerKey: 'will',
        acceptedAnswers: ['will', 'shall'],
        explanation: '"I/We will + kata kerja dasar" untuk menyampaikan tindakan yang akan dilakukan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Choose the correct sentence.',
        options: [
          'We will proceeding with your refund.',
          'We will proceed with your refund.',
          'We will to proceed with your refund.',
          'We will proceeded with your refund.',
        ],
        answerKey: 'B',
        explanation: 'Setelah "will" selalu kata kerja dasar: will proceed.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Let me check with the vendor first',
        explanation: '"Let me + kata kerja dasar" = Izinkan saya… — alternatif sopan dari "I will".',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Choose the correct sentence.',
        options: [
          'Would you allow me check your account?',
          'Would you allowing me to check your account?',
          'Would you allow to me check your account?',
          'Would you allow me to check your account?',
        ],
        answerKey: 'D',
        explanation: 'Polanya "Would you allow me to + kata kerja dasar?"',
      },
      {
        type: 'ISIAN',
        prompt: 'I am ___ that we have made a mistake with your order.',
        answerKey: 'afraid',
        explanation: '"I am afraid (that)…" = menyampaikan kabar buruk dengan halus.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which sentence delivers bad news politely?',
        options: [
          'It seems that there has been a mix-up with your order.',
          'You got the wrong order. Deal with it.',
          'Your order is wrong and we do not know why.',
          'Someone made a stupid mistake with your order.',
        ],
        answerKey: 'A',
        explanation: '"It seems (that)…" / "It appears (that)…" = memperhalus kabar buruk.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I will get back to you as soon as possible',
        explanation: '"Get back to you" = menghubungi Anda kembali.',
      },
      {
        type: 'ISIAN',
        prompt: 'This should be ___ by the end of this week.',
        answerKey: 'resolved',
        acceptedAnswers: ['resolved', 'fixed', 'solved', 'done'],
        explanation: '"Should be + V3" (pasif): masalah ini seharusnya selesai akhir minggu ini.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"I will be in touch shortly." Apa maksudnya?',
        options: [
          'Saya akan menyentuh sebentar',
          'Saya akan segera menghubungi Anda',
          'Saya akan pendek saja',
          'Saya tidak bisa dihubungi',
        ],
        answerKey: 'B',
        explanation: '"Be in touch" = menghubungi; "shortly" = segera.',
      },
    ],
  },
  {
    code: 'CMP-208',
    title: 'Konfirmasi Penyelesaian',
    skill: 'GRAMMAR',
    cefr: 'B1',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: '___ the technician fix the issue?',
        options: ['Was', 'Does', 'Did', 'Were'],
        answerKey: 'C',
        explanation: 'Simple past, kalimat aktif: Did + subjek + kata kerja dasar?',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '___ the problem resolved successfully?',
        options: ['Did', 'Was', 'Were', 'Does'],
        answerKey: 'B',
        explanation: 'Kalimat pasif masa lampau: Was/Were + subjek + V3? "Problem" tunggal → was.',
      },
      {
        type: 'ISIAN',
        prompt: 'Did you ___ the new access card? (receive)',
        answerKey: 'receive',
        explanation: 'Setelah "Did", kata kerjanya kembali ke bentuk dasar: receive (bukan received).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Choose the correct question.',
        options: [
          'Did the vendor sent the new chairs?',
          'Did the vendor send the new chairs?',
          'Was the vendor send the new chairs?',
          'Did the vendor sending the new chairs?',
        ],
        answerKey: 'B',
        explanation: 'Did + subjek + kata kerja dasar: "Did the vendor send…?"',
      },
      {
        type: 'ISIAN',
        prompt: '___ you satisfied with the result?',
        answerKey: 'were',
        explanation: 'You/We/They → were; I/He/She/It → was.',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'Did everything work out well',
        explanation: '"Did everything work out well?" = Apakah semuanya berjalan baik?',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: '"The error was fixed." Ubah menjadi pertanyaan.',
        options: [
          'Did the error fixed?',
          'Was fixed the error?',
          'Did the error fix?',
          'Was the error fixed?',
        ],
        answerKey: 'D',
        explanation: 'Pasif: pindahkan "was" ke depan → "Was the error fixed?"',
      },
      {
        type: 'SUSUN_KALIMAT',
        prompt: SUSUN,
        answerKey: 'I just wanted to follow up on your request',
        explanation: '"I just wanted to follow up on…" = pembuka saat mengonfirmasi tindak lanjut.',
      },
      {
        type: 'ISIAN',
        prompt: 'Was the problem resolved? Do you have any other ___?',
        answerKey: 'concerns',
        acceptedAnswers: ['concerns', 'questions', 'issues', 'problems'],
        explanation: '"Do you have any other concerns?" = Apakah ada keluhan lain?',
      },
    ],
  },
  {
    code: 'CMP-209',
    title: 'Email Keluhan & Balasannya',
    skill: 'READING',
    cefr: 'B1',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Why did Rina write this email?',
        options: [
          'To order more paper',
          'To ask for a price list',
          'To cancel the order',
          'To complain about a late and damaged delivery',
        ],
        answerKey: 'D',
        passage: EMAIL_COMPLAINT,
        explanation: '"I am writing to complain about…" — pengirimannya terlambat dan sebagian rusak.',
      },
      {
        type: 'ISIAN',
        prompt: 'The boxes arrived on May ___.',
        answerKey: '9',
        acceptedAnswers: ['9', '9th', 'nine', 'ninth'],
        passage: EMAIL_COMPLAINT,
        explanation: '"…the boxes did not arrive until May 9." Tanggal 5 adalah janji pengiriman.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What does Rina want?',
        options: [
          'A full refund',
          'Three new boxes to replace the damaged ones',
          'A new supplier',
          'A discount on the next order',
        ],
        answerKey: 'B',
        passage: EMAIL_COMPLAINT,
        explanation: '"I would like you to replace the three damaged boxes this week."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which sentence shows what Rina expects as a solution?',
        options: [
          'I am writing to complain about our order of printer paper.',
          'Attached are photos of the boxes and the delivery note.',
          'I would like you to replace the three damaged boxes this week.',
          'I look forward to hearing from you soon.',
        ],
        answerKey: 'C',
        passage: EMAIL_COMPLAINT,
        explanation: '"I would like you to…" = ungkapan harapan penyelesaian keluhan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What caused the delay?',
        options: [
          'Bad weather',
          'A wrong address',
          'A problem with the delivery truck',
          'The paper was out of stock',
        ],
        answerKey: 'C',
        passage: EMAIL_REPLY,
        explanation: '"The delay was due to a problem with our delivery truck."',
      },
      {
        type: 'ISIAN',
        prompt: 'The new boxes will be sent on ___.',
        answerKey: 'Thursday',
        passage: EMAIL_REPLY,
        explanation: '"We will send three new boxes to your office on Thursday."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which phrase refers to the previous email?',
        options: [
          'I am writing with regard to your recent email',
          'Please accept our apologies',
          'at no extra cost',
          'Yours sincerely',
        ],
        answerKey: 'A',
        passage: EMAIL_REPLY,
        explanation: '"With regard to your recent email" = merujuk kontak sebelumnya, pembuka balasan yang formal.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which closing is the most suitable for a formal reply to a complaint?',
        options: ['Cheers', 'See ya', 'Yours sincerely', 'Thanks again'],
        answerKey: 'C',
        passage: EMAIL_REPLY,
        explanation: '"Yours sincerely" / "Sincerely" = salam penutup formal.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which greeting is best for replying to Rina Putri?',
        options: ['Hai Rina,', 'Yo Rina!', 'Hey there,', 'Dear Ms. Putri,'],
        answerKey: 'D',
        passage: EMAIL_COMPLAINT,
        explanation: 'Email formal: pakai "Dear" + gelar + nama belakang pengirim.',
      },
    ],
  },
  {
    code: 'CMP-210',
    title: 'Menangani Keluhan lewat Telepon',
    skill: 'LISTENING',
    cefr: 'B1',
    items: [
      {
        type: 'PILIHAN_GANDA',
        prompt: 'How does the helpdesk start the call?',
        options: [
          'He asks for a password',
          'He greets the caller and offers help',
          'He apologizes',
          'He ends the call',
        ],
        answerKey: 'B',
        tts: 'Thank you for calling the IT helpdesk, this is Andi speaking. How may I assist you?',
        explanation: '"Thank you for calling…, this is… speaking. How may I assist you?" = salam pembuka + menawarkan bantuan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: "What is the caller's problem?",
        options: [
          'She forgot her password',
          'Her laptop is broken',
          'She cannot send emails',
          'She lost her phone',
        ],
        answerKey: 'C',
        tts: 'Hi, this is Dewi from Finance. I have been having an issue with my email since this morning. I cannot send any messages.',
        explanation: '"…I cannot send any messages." — masalahnya mengirim email.',
      },
      {
        type: 'ISIAN',
        prompt: 'The helpdesk asks for the caller\'s employee ___.',
        answerKey: 'ID',
        acceptedAnswers: ['ID', 'ID number', 'number'],
        tts: 'Before we proceed, could you please tell me your employee ID number?',
        explanation: '"…your employee ID number" — verifikasi data sebelum menangani keluhan.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What is the helpdesk doing?',
        options: [
          'Asking for information',
          'Apologizing and showing empathy',
          'Promising an action',
          'Closing the call',
        ],
        answerKey: 'B',
        tts: 'I do apologize for the trouble. I understand how frustrating that must be.',
        explanation: '"I do apologize…" = minta maaf; "I understand how frustrating…" = empati.',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'What should the caller do?',
        options: [
          'Call back tomorrow',
          'Send an email',
          'Change her password',
          'Restart her laptop in five minutes',
        ],
        answerKey: 'D',
        tts: 'I will reset your email account now. Please restart your laptop in five minutes.',
        explanation: '"Please restart your laptop in five minutes."',
      },
      {
        type: 'ISIAN',
        prompt: "The technician will come at ___ o'clock.",
        answerKey: 'two',
        acceptedAnswers: ['two', '2'],
        tts: "If it still does not work, our technician will visit your desk at two o'clock this afternoon.",
        explanation: '"…at two o\'clock this afternoon."',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Why does the helpdesk say this?',
        options: [
          'To confirm the problem is solved',
          'To take a new complaint',
          'To end the call quickly',
          'To ask for payment',
        ],
        answerKey: 'A',
        tts: 'Did the reset fix the problem? I just want to make sure everything works.',
        explanation: '"Did the reset fix the problem?" = konfirmasi penyelesaian (simple past).',
      },
      {
        type: 'PILIHAN_GANDA',
        prompt: 'Which part of the call is this?',
        options: ['Opening', 'Verification', 'Closing', 'Complaint'],
        answerKey: 'C',
        tts: 'Is there anything else I may assist you with? Thank you for calling, and have a great day.',
        explanation: '"Is there anything else…? Thank you for calling…" = penutup percakapan.',
      },
    ],
  },
  {
    code: 'CMP-211',
    title: 'Ucapkan: Menangani Keluhan',
    skill: 'SPEAKING',
    cefr: 'B1',
    items: [
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: "I'd like to make a complaint about the last delivery",
        explanation: 'Membuka keluhan dengan sopan.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'Could you tell me exactly what happened',
        explanation: 'Menggali informasi dari orang yang mengeluh.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'I apologize for the inconvenience',
        explanation: 'Permintaan maaf standar yang formal.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'I understand how frustrating that must have been',
        explanation: 'Menunjukkan empati.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'Thank you for bringing that to our attention',
        explanation: 'Berterima kasih atas keluhan/masukan.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'I will take care of this right away',
        explanation: 'Menjanjikan tindakan segera.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'Did the technician fix the issue',
        explanation: 'Mengonfirmasi penyelesaian dengan simple past.',
      },
      {
        type: 'UCAPAN',
        prompt: UCAP,
        answerKey: 'Is there anything else I can help you with',
        explanation: 'Menutup percakapan.',
      },
    ],
  },
];

async function main() {
  const useTts = hasMacTts();
  const store = makeAudioStore();
  if (!useTts) {
    console.warn(
      `⚠ TTS macOS (say/afconvert) tidak tersedia — memakai .m4a yang sudah ada di ${store.label}; sisanya WAV senyap.`,
    );
  }

  // urutan lesson: lanjut dari max(order) level ini (pola importer)
  const maxOrder = await prisma.lesson.aggregate({
    where: { level: LEVEL },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  let lessonsCreated = 0;
  let itemsCreated = 0;
  let itemsSkipped = 0;
  let audioFiles = 0;

  for (const dl of LESSONS) {
    let lesson = await prisma.lesson.findUnique({ where: { code: dl.code } });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          code: dl.code,
          title: dl.title,
          topic: TOPIC,
          level: LEVEL,
          cefr: dl.cefr,
          skill: dl.skill,
          order: nextOrder++,
          status: 'LIVE',
        },
      });
      lessonsCreated++;
    }

    for (let i = 0; i < dl.items.length; i++) {
      const order = i + 1;
      const exists = await prisma.item.findUnique({
        where: { lessonId_order: { lessonId: lesson.id, order } },
        select: { id: true },
      });
      if (exists) {
        itemsSkipped++;
        continue;
      }
      const it = dl.items[i];
      let mediaFile: string | null = null;
      if (it.tts) {
        mediaFile = await makeAudio(
          `${dl.code.toLowerCase()}-${String(order).padStart(2, '0')}`,
          it.tts,
          useTts,
          store,
        );
        audioFiles++;
      }
      const acceptedAnswers =
        it.type === 'ISIAN'
          ? Array.from(new Set([it.answerKey, ...(it.acceptedAnswers ?? [])].map((a) => a.trim())))
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
          mediaFile,
          passage: it.passage ?? null,
          status: 'LIVE',
        },
      });
      itemsCreated++;
    }
  }

  console.log(
    `✔ "${TOPIC}" (${LEVEL}): ${lessonsCreated} lesson baru, ${itemsCreated} soal baru (${audioFiles} audio), ${itemsSkipped} soal sudah ada — dilewati.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
