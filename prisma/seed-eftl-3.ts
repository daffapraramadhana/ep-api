// apps/api/prisma/seed-eftl-3.ts
import { KitModule, seedModule } from './seed-module-kit';

/**
 * Seed KONTEN — EFTL Modul 3 "Guest Complaint Handling" (MENENGAH·B1), dari
 * PDF klien "Modul 3 EFTL Samitago" (English for Tour Leaders). Konteks tetap
 * Tour Leader (kamar hotel, bus terlambat, bagasi hilang, makanan, perubahan
 * jadwal). 10 bab, kuis EFT-301..310; langsung LIVE.
 *
 * Alur: menyapa tamu yang mengeluh → mendengarkan → ungkapan empati →
 * mencatat keluhan → menenangkan tamu → menjelaskan penyebab → menawarkan
 * solusi → studi kasus alur lengkap → menyimak keluhan (TTS) → ucapan.
 *
 * Catatan sumber: teks PDF terputus di tengah §2.3 "Offering Solutions" (satu
 * halaman berupa gambar). Bab EFT-307 melengkapinya: opsi konkret,
 * konfirmasi kepuasan tamu, tindak lanjut & penutup.
 *
 * Jalankan: `npm run seed:eftl-3`. CREATE-ONLY (lihat seed-module-kit.ts).
 */

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const HOT_WATER = `It is 9 p.m. at the Grand Lotus Hotel in Bandung. Mrs. Wilson, a guest on Rina's tour, comes down to the lobby. She looks upset.

Rina greets her and listens carefully. Mrs. Wilson explains that the shower in her room has no hot water. She tried to call the front desk at 8 p.m., but nobody answered the phone. She is tired after a long day of sightseeing and wants to take a hot shower before bed.

Rina says, "Mind if I write this down? I want to make sure I get everything right." She writes: Mrs. Wilson, Room 512, no hot water since 8 p.m., front desk did not answer. Then she reads the details back to Mrs. Wilson and says, "I am recording this so we can investigate it immediately."`;

const LOST_LUGGAGE = `Dedi is a tour leader. His group has just landed in Bali after a flight from Tokyo. At the baggage claim, Mr. Tanaka waits for a long time, but his suitcase does not arrive. He walks over to Dedi, looking very worried.

Dedi says, "Good afternoon, Mr. Tanaka. Is everything alright?" Mr. Tanaka explains that his black suitcase is missing and that his medicine is inside it. Dedi listens without interrupting. Then he says, "I'm so sorry to hear that. I see why you are concerned about this."

Dedi writes down the details: a large black suitcase with a red ribbon on the handle. Together they go to the airline's lost and found desk. The airline staff explain that some bags were not loaded because the plane was too full. The suitcase will arrive on the next flight and will be delivered to the hotel tonight.

Dedi offers two options: "Would you prefer to buy your medicine at a pharmacy near the hotel now, or should I ask the hotel doctor to visit you?" Mr. Tanaka chooses the pharmacy. Before dinner, Dedi checks back with him to make sure everything is fine.`;

const ROOM_NOT_CLEANED = `Mrs. Clark: Excuse me, Dedi. Our room hasn't been cleaned, and there are no fresh towels.
Dedi: I'm so sorry to hear that, Mrs. Clark. May I have your room number?
Mrs. Clark: It's room 308.
Dedi: Thank you. I'll ask housekeeping to clean your room within thirty minutes.`;

const BUS_LATE = `Rina: Good morning, everyone. I'm sorry, but our bus is running late.
Mr. Brown: Again? We've been waiting for twenty minutes already!
Rina: I completely understand how frustrating this must be. What happened was the bus had a flat tyre on the way here.
Mr. Brown: So when will it arrive?
Rina: The driver is changing the tyre now. It will be here in about fifteen minutes.`;

const SPICY_FOOD = `Ms. Lopez: Dedi, I'm sorry, but I can't eat this. It's far too spicy for me.
Dedi: I'm really sorry about that, Ms. Lopez. Thank you for telling me. Would you prefer a mild chicken soup or fried rice without chili?
Ms. Lopez: The chicken soup, please.
Dedi: Of course. I'll ask the kitchen to prepare it right away.`;

const SCHEDULE_CHANGE = `Rina: Mr. Tanaka, I'm afraid there's a change to tomorrow's schedule. Due to heavy rain, the volcano tour has been postponed.
Mr. Tanaka: Oh no. That was the part I was most excited about.
Rina: I completely understand, and I'm very sorry. Here is what I can do. We can visit the volcano on Friday morning instead, and tomorrow we'll go to the batik museum.
Mr. Tanaka: Friday is fine. Thank you for letting me know.`;

export const def: KitModule = {
  slug: 'eftl-3-guest-complaints',
  title: 'Guest Complaint Handling',
  summary:
    'Menangani keluhan tamu tur dengan tenang: menyapa, mendengarkan, berempati, mencatat, lalu menjelaskan dan menawarkan solusi.',
  topic: 'Guest Complaint Handling',
  level: 'MENENGAH',
  cefr: 'B1',
  status: 'LIVE',
  showInPath: true,
  chapters: [
    {
      code: 'EFT-301',
      title: 'Menyapa Tamu yang Punya Keluhan',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 4,
      body: `Tamu yang punya keluhan biasanya sedang kesal, lelah, atau bingung. Sapaan pertama yang sopan, ramah, dan profesional membantu meredakan ketegangan sebelum masalahnya dibahas.

## Frasa kunci

:::phrases
- Good morning, Sir. How can I help you today? | Selamat pagi, Pak. Ada yang bisa saya bantu hari ini?
- Good evening, Madam. How can I help you today? | Selamat malam, Bu. Ada yang bisa saya bantu hari ini?
- Hi, Mrs. Clark, is everything alright? You look like you need some assistance. | Halo, Bu Clark, apakah semuanya baik-baik saja? Anda terlihat seperti membutuhkan bantuan.
- Hello, Mr. Tanaka, please let me know if there's anything I can help you with right now. | Halo, Pak Tanaka, mohon beri tahu saya jika ada yang bisa saya bantu saat ini.
- Good day! How may I assist you with your tour experience so far? | Selamat siang! Bagaimana saya bisa membantu Anda terkait pengalaman tur Anda sejauh ini?
:::

:::tip
Panggil tamu dengan namanya: **Mr.** untuk pria, **Mrs.** untuk wanita yang sudah menikah, **Ms.** untuk wanita (aman dipakai kapan pun). Kalau belum tahu namanya, pakai **Sir** atau **Madam**.

Kalau memungkinkan, ajak tamu bicara di tempat yang lebih tenang, sedikit menjauh dari rombongan.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): Good evening, Mr. Tanaka. Is everything alright? You look like you need some assistance.
Mr. Tanaka (Tamu): Yes, actually. There's a problem with my room.
Kamu (Tour Leader): I'm sorry to hear that. Please let me know how I can help.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest walks up to you at breakfast. He looks upset. What is the best first thing to say?',
          options: [
            "What's wrong with you?",
            "Wait, I'm busy right now.",
            'Good morning, Sir. How can I help you today?',
            "It's not my problem.",
          ],
          answerKey: 'C',
          explanation:
            'Sapaan sopan + tawaran bantuan meredakan ketegangan: "Good morning, Sir. How can I help you today?"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "How may I assist you?" mean?',
          options: [
            'Bagaimana saya bisa membantu Anda?',
            'Di mana Anda menginap?',
            'Kapan Anda tiba di sini?',
            'Apa yang ingin Anda pesan?',
          ],
          answerKey: 'A',
          explanation:
            '"Assist" = membantu. "How may I assist you?" = versi formal dari "How can I help you?"',
        },
        {
          type: 'ISIAN',
          prompt:
            'Hi, Mrs. Clark, is everything ___? You look like you need some assistance.',
          answerKey: 'alright',
          acceptedAnswers: ['all right', 'okay', 'ok'],
          explanation:
            '"Is everything alright?" = Apakah semuanya baik-baik saja?',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            "You don't know a female guest's name. How do you address her politely?",
          options: ['Sir', 'Madam', 'Mister', 'Buddy'],
          answerKey: 'B',
          explanation:
            '"Madam" = Ibu (sapaan sopan untuk wanita). "Sir" untuk pria.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'How can I help you today',
          explanation:
            '"How can I help you today?" = Ada yang bisa saya bantu hari ini?',
        },
        {
          type: 'ISIAN',
          prompt:
            "Hello, Mr. Tanaka, please let me ___ if there's anything I can help you with right now.",
          answerKey: 'know',
          explanation: '"Please let me know…" = mohon beri tahu saya…',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which greeting is NOT appropriate for a guest who has a complaint?',
          options: [
            'Good afternoon, Madam. How can I help you?',
            'Hello, Mr. Brown. Is everything alright?',
            'Good day! How may I assist you?',
            "Hey, what's your problem?",
          ],
          answerKey: 'D',
          explanation:
            '"What\'s your problem?" terdengar kasar dan menantang — justru memperbesar ketegangan.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'You look like you need some assistance',
          explanation:
            '"You look like you need some assistance." = Anda terlihat seperti membutuhkan bantuan.',
        },
      ],
    },
    {
      code: 'EFT-302',
      title: 'Mendengarkan dengan Seksama',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 4,
      body: `Setelah menyapa, biarkan tamu bercerita sampai selesai. Jangan memotong dan jangan langsung membela diri. Tujuannya: memahami masalah secara utuh.

## Frasa kunci

:::phrases
- I'm listening, please go on. | Saya mendengarkan, silakan dilanjutkan.
- Please take your time, tell me all the details. | Silakan santai saja, ceritakan semua detailnya kepada saya.
- I understand. Please continue. | Saya mengerti. Silakan lanjutkan.
- I see. And what happened next? | Begitu. Lalu apa yang terjadi selanjutnya? | menggali urutan kejadian
- When did you first notice the problem? | Kapan Anda pertama kali menyadari masalahnya? | memperjelas waktu
:::

| Lakukan | Hindari |
|---|---|
| Menatap tamu dan mengangguk | Memotong pembicaraan |
| Memberi tanda menyimak: *I see*, *I understand* | Langsung membela diri: *That's not my fault.* |
| Bertanya untuk memperjelas | Sibuk dengan ponsel |

## Dalam tur

:::dialog
Mrs. Clark (Tamu): The air conditioner in my room is very noisy. I couldn't sleep at all last night.
Kamu (Tour Leader): I'm listening, please go on.
Mrs. Clark (Tamu): I called the front desk twice, but nobody came.
Kamu (Tour Leader): I understand. Please continue.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "Please go on" mean?',
          options: [
            'Silakan pergi',
            'Silakan lanjutkan',
            'Silakan duduk',
            'Silakan tunggu',
          ],
          answerKey: 'B',
          explanation:
            '"Go on" = melanjutkan. "I\'m listening, please go on." = Saya mendengarkan, silakan dilanjutkan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest is explaining a problem to you. What should you NOT do?',
          options: [
            'Nod and keep eye contact',
            'Ask questions to make things clear',
            'Interrupt and say, "That\'s not my fault."',
            'Let the guest finish the story',
          ],
          answerKey: 'C',
          explanation:
            'Memotong dan membela diri membuat tamu merasa tidak didengar.',
        },
        {
          type: 'ISIAN',
          prompt: 'Please take your ___, tell me all the details.',
          answerKey: 'time',
          explanation:
            '"Take your time" = santai saja, tidak perlu terburu-buru.',
        },
        {
          type: 'ISIAN',
          prompt: "I'm ___, please go on.",
          answerKey: 'listening',
          explanation: '"I\'m listening" = saya mendengarkan.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'When did you first notice the problem',
          explanation:
            '"When did you first notice the problem?" = Kapan Anda pertama kali menyadari masalahnya?',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest says, "…and then the driver left without us!" You want the guest to keep talking. What do you say?',
          options: [
            'I see. And what happened next?',
            'Okay, goodbye.',
            "That's impossible.",
            "Why didn't you walk faster?",
          ],
          answerKey: 'A',
          explanation:
            '"I see. And what happened next?" menunjukkan kamu menyimak dan mengajak tamu melanjutkan cerita.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is the main goal when you listen to a complaint?',
          options: [
            'To finish the conversation quickly',
            'To prepare your excuse',
            'To find out who is guilty',
            'To understand the whole problem without interrupting',
          ],
          answerKey: 'D',
          explanation:
            'Tujuan mendengarkan: memahami masalah secara utuh tanpa memotong.',
        },
      ],
    },
    {
      code: 'EFT-303',
      title: 'Ungkapan Empati',
      skill: 'VOCABULARY',
      cefr: 'B1',
      estMinutes: 5,
      body: `Empati berarti menunjukkan bahwa kamu memahami perasaan tamu dan menganggap keluhannya serius. Empati tidak sama dengan mengaku salah — tapi tamu yang merasa dipahami akan jauh lebih tenang.

## Frasa kunci

:::phrases
- I completely understand how frustrating this must be for you. | Saya sangat memahami betapa menjengkelkannya hal ini bagi Anda.
- I'm so sorry to hear that you are experiencing this issue. | Saya sangat menyesal mendengar Anda mengalami masalah ini.
- Thank you for bringing this to my attention; I appreciate you telling me. | Terima kasih telah menyampaikan hal ini kepada saya; saya menghargai Anda sudah memberi tahu saya.
- I see why you are concerned about this. | Saya paham mengapa Anda khawatir tentang hal ini.
- I'm really sorry that your comfort has been disrupted. | Saya sungguh minta maaf karena kenyamanan Anda terganggu.
:::

## Kosakata perasaan

:::phrases
- frustrating | menjengkelkan | untuk keadaannya: The delay is frustrating.
- frustrated | merasa jengkel | untuk orangnya: The guest is frustrated.
- concerned / worried | khawatir
- upset | kesal, sedih
- disappointed | kecewa
:::

:::tip
Kata sifat **-ing** menggambarkan hal yang menyebabkan perasaan (*a frustrating delay*), sedangkan **-ed** menggambarkan perasaan orangnya (*a frustrated guest*).

Ucapkan terima kasih atas keluhan tamu — mereka sebenarnya memberi kesempatan untuk memperbaiki layanan.
:::

## Dalam tur

:::dialog
Mr. Brown (Tamu): We waited forty minutes for our lunch, and the food was cold.
Kamu (Tour Leader): I'm so sorry to hear that. I completely understand how frustrating this must be for you.
Mr. Brown (Tamu): And this is our only free afternoon.
Kamu (Tour Leader): I see why you are concerned about this. Thank you for bringing this to my attention.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which sentence shows empathy?',
          options: [
            "That's not a big deal.",
            'Everyone else is fine with it.',
            'You should have told me earlier.',
            'I completely understand how frustrating this must be for you.',
          ],
          answerKey: 'D',
          explanation:
            'Kalimat empati mengakui perasaan tamu, bukan meremehkan atau menyalahkan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'What does "Thank you for bringing this to my attention" mean?',
          options: [
            'Terima kasih telah menyampaikan hal ini kepada saya',
            'Terima kasih atas perhatian Anda selama tur',
            'Terima kasih sudah membawakan barang saya',
            'Terima kasih sudah datang tepat waktu',
          ],
          answerKey: 'A',
          explanation:
            '"Bring something to someone\'s attention" = menyampaikan/melaporkan sesuatu kepada seseorang.',
        },
        {
          type: 'ISIAN',
          prompt:
            "I'm really sorry that your comfort has been ___. (terganggu)",
          answerKey: 'disrupted',
          acceptedAnswers: ['disturbed'],
          explanation:
            '"Your comfort has been disrupted" = kenyamanan Anda terganggu.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Mr. Brown waited forty minutes for his lunch. He feels very ___.',
          options: ['frustrating', 'frustrate', 'frustrated', 'frustration'],
          answerKey: 'C',
          explanation:
            'Perasaan orangnya → bentuk -ed: "He feels frustrated." Keadaannya → -ing: "The wait is frustrating."',
        },
        {
          type: 'ISIAN',
          prompt: 'I see why you are ___ about this. (khawatir)',
          answerKey: 'concerned',
          acceptedAnswers: ['worried'],
          explanation: '"Concerned" / "worried" = khawatir.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest says, "My suitcase was damaged on the flight." Which reply is the most empathetic?',
          options: [
            'Suitcases get damaged all the time.',
            "I'm so sorry to hear that. I can see why you're upset.",
            "That's the airline's problem, not mine.",
            'Are you sure it was not damaged before?',
          ],
          answerKey: 'B',
          explanation:
            'Minta maaf + akui perasaan tamu ("I can see why you\'re upset") = empati.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey:
            "I'm so sorry to hear that you are experiencing this issue",
          explanation:
            '"I\'m so sorry to hear that you are experiencing this issue." = Saya sangat menyesal mendengar Anda mengalami masalah ini.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'I see why you are concerned about this',
          explanation:
            '"I see why you are concerned about this." = Saya paham mengapa Anda khawatir tentang hal ini.',
        },
      ],
    },
    {
      code: 'EFT-304',
      title: 'Mencatat Keluhan Tamu',
      skill: 'READING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Catat detail keluhan dengan akurat. Catatan ini kamu pakai untuk menyelesaikan masalah dan untuk laporan ke hotel, vendor, atau kantor. Minta izin dulu sebelum mencatat, lalu baca ulang detailnya kepada tamu.

## Frasa kunci

:::phrases
- Let me just make a quick note of this so I don't miss any details. | Izinkan saya mencatat ini secara singkat agar tidak ada detail yang terlewat.
- Mind if I write this down? I want to make sure I get everything right. | Apakah tidak apa-apa jika saya mencatat ini? Saya ingin memastikan semua informasinya tepat.
- Let me double-check the details: your room number, the time, and what happened. | Izinkan saya memeriksa ulang detailnya: nomor kamar, waktu, dan apa yang terjadi.
- I am recording this so we can investigate it immediately. | Saya mencatat hal ini agar kami dapat segera memeriksanya.
:::

## Detail yang dicatat

| Detail | Contoh pertanyaan |
|---|---|
| Nama & nomor kamar | May I have your name and room number? |
| Waktu | What time did this happen? |
| Kejadian | Could you tell me exactly what happened? |
| Harapan tamu | What would you like us to do? |

:::tip
Setelah mencatat, baca ulang dan minta konfirmasi: *So, Room 512, no hot water since 8 p.m. Is that correct?* Tamu jadi yakin keluhannya dipahami dengan benar.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is Mrs. Wilson's problem?",
          options: [
            'Her room is too noisy',
            'She lost her room key',
            'There is no hot water in the shower',
            'The air conditioner is broken',
          ],
          answerKey: 'C',
          passage: HOT_WATER,
          explanation:
            '"…the shower in her room has no hot water." = shower di kamarnya tidak ada air panas.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is Mrs. Wilson's room number?",
          options: ['215', '152', '521', '512'],
          answerKey: 'D',
          passage: HOT_WATER,
          explanation: 'Catatan Rina: "Mrs. Wilson, Room 512…"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why does Rina read the details back to Mrs. Wilson?',
          options: [
            'To check that the information is correct',
            'To practise her English',
            'To make the guest wait longer',
            'To report Mrs. Wilson to the manager',
          ],
          answerKey: 'A',
          passage: HOT_WATER,
          explanation:
            'Membaca ulang catatan = memastikan semua detail benar sebelum ditindaklanjuti.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What time did Mrs. Wilson try to call the front desk?',
          options: ['At 7 p.m.', 'At 8 p.m.', 'At 9 p.m.', 'At 10 p.m.'],
          answerKey: 'B',
          passage: HOT_WATER,
          explanation:
            '"She tried to call the front desk at 8 p.m." Pukul 9 malam adalah saat ia datang ke lobi.',
        },
        {
          type: 'ISIAN',
          prompt:
            "Let me just make a quick ___ of this so I don't miss any details.",
          answerKey: 'note',
          explanation: '"Make a note of something" = mencatat sesuatu.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Mind if I ___ this down? I want to make sure I get everything right.',
          answerKey: 'write',
          acceptedAnswers: ['jot', 'note'],
          explanation: '"Write this down" / "jot this down" = mencatat ini.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'I want to make sure I get everything right',
          explanation:
            '"I want to make sure I get everything right." = Saya ingin memastikan semua informasinya tepat.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Before you write down a complaint, it is polite to…',
          options: [
            'tell the guest to wait outside',
            'ask the guest to write it down themselves',
            'start writing without saying anything',
            'ask, "Mind if I write this down?"',
          ],
          answerKey: 'D',
          explanation:
            'Minta izin dulu: "Mind if I write this down?" — sopan dan menunjukkan keluhannya ditanggapi serius.',
        },
      ],
    },
    {
      code: 'EFT-305',
      title: 'Menenangkan Tamu',
      skill: 'VOCABULARY',
      cefr: 'B1',
      estMinutes: 5,
      body: `Sebelum menawarkan solusi, bantu tamu tenang dulu. Tamu yang masih marah sulit diajak berdiskusi. Minta maaf dengan tulus, tunjukkan kamu ada di pihaknya, dan ambil tanggung jawab untuk mengurusnya.

## Frasa kunci

:::phrases
- I sincerely apologize for this inconvenience. Let's work together to fix this. | Saya memohon maaf yang sebesar-besarnya atas ketidaknyamanan ini. Mari kita bekerja sama untuk menyelesaikannya.
- Please don't worry, I am here to help sort this out for you. | Bapak/Ibu tidak perlu khawatir, saya di sini untuk membantu menyelesaikan masalah ini.
- Take a deep breath, Sir. I will personally take care of this. | Tarik napas dalam-dalam, Pak. Saya pribadi yang akan mengurus hal ini.
- I completely understand your anger, and I am very sorry for the trouble. | Saya sangat memahami kemarahan Anda, dan saya sangat menyesal atas masalah yang terjadi.
:::

## Kosakata

:::phrases
- sort out | menyelesaikan (masalah) | Let me sort this out for you.
- take care of | mengurus, menangani | I'll take care of it.
- personally | secara pribadi, langsung oleh saya
- inconvenience | ketidaknyamanan
:::

:::tip
Hindari **Calm down!** — kalimat ini justru sering membuat tamu makin marah. Lebih aman: *Please don't worry, I am here to help.*

**Take a deep breath** pakai hanya dengan nada lembut. Bicara pelan, suara rendah, dan jangan ikut terbawa emosi.
:::

## Dalam tur

:::dialog
Mr. Tanaka (Tamu): This is unacceptable! We have been waiting for the bus for almost an hour!
Kamu (Tour Leader): I sincerely apologize for this inconvenience, Mr. Tanaka. Please don't worry, I am here to help sort this out.
Mr. Tanaka (Tamu): My wife is tired, and it's very hot out here.
Kamu (Tour Leader): I completely understand. I will personally take care of this. Let's wait inside the café, where it's cooler.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest is angry. Which sentence may make the guest angrier?',
          options: [
            "Please don't worry, I am here to help.",
            "Calm down! You're overreacting.",
            'I sincerely apologize for this inconvenience.',
            'I will personally take care of this.',
          ],
          answerKey: 'B',
          explanation:
            '"Calm down! You\'re overreacting." meremehkan perasaan tamu dan biasanya membuatnya makin marah.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "I will personally take care of this" mean?',
          options: [
            'Silakan Anda urus sendiri',
            'Saya akan menyerahkannya ke orang lain',
            'Saya pribadi yang akan mengurus hal ini',
            'Saya tidak bisa membantu hal ini',
          ],
          answerKey: 'C',
          explanation:
            '"Personally" = secara pribadi/langsung. "Take care of" = mengurus.',
        },
        {
          type: 'ISIAN',
          prompt: 'I sincerely ___ for this inconvenience.',
          answerKey: 'apologize',
          acceptedAnswers: ['apologise'],
          explanation:
            '"I sincerely apologize" = saya memohon maaf yang sebesar-besarnya.',
        },
        {
          type: 'ISIAN',
          prompt: "Please don't worry, I am here to help ___ this out for you.",
          answerKey: 'sort',
          explanation: '"Sort something out" = menyelesaikan masalah.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'You say, "Let\'s work together to fix this." What do you want to do?',
          options: [
            'Blame the hotel',
            'End the conversation',
            'Ask the guest to fix it alone',
            'Solve the problem together with the guest',
          ],
          answerKey: 'D',
          explanation:
            '"Let\'s work together to fix this" = mari kita bekerja sama untuk menyelesaikannya.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: "Let's work together to fix this",
          explanation:
            '"Let\'s work together to fix this." = Mari kita bekerja sama untuk menyelesaikannya.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "ketidaknyamanan"?',
          options: ['inconvenience', 'convenience', 'incident', 'complaint'],
          answerKey: 'A',
          explanation:
            '"Inconvenience" = ketidaknyamanan. "Convenience" justru berarti kenyamanan/kemudahan.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'I will personally take care of this',
          explanation:
            '"I will personally take care of this." = Saya pribadi yang akan mengurus hal ini.',
        },
      ],
    },
    {
      code: 'EFT-306',
      title: 'Menjelaskan Penyebab Keluhan',
      skill: 'GRAMMAR',
      cefr: 'B1',
      estMinutes: 6,
      body: `Tamu berhak tahu apa yang terjadi. Jelaskan penyebabnya dengan jujur dan singkat — tapi jangan terdengar seperti mencari alasan atau menyalahkan orang lain. Setelah menjelaskan, langsung lanjut ke solusi.

## Frasa kunci

:::phrases
- To give you a bit of context, the bus was delayed by heavy traffic. | Untuk memberi sedikit gambaran, bus terlambat karena macet parah.
- Due to unexpected weather conditions, the boat trip has been postponed. | Karena kondisi cuaca yang tidak terduga, perjalanan kapal ditunda.
- Due to a technical issue, the hot water in your room is not working. | Karena kendala teknis, air panas di kamar Anda tidak berfungsi.
- The hotel experienced a slight delay because many guests checked in at the same time. | Pihak hotel mengalami sedikit keterlambatan karena banyak tamu check-in bersamaan.
- Allow me to explain why this situation occurred. | Izinkan saya menjelaskan mengapa situasi ini bisa terjadi.
:::

## Tata bahasa: because vs due to

| Kata | Diikuti | Contoh |
|---|---|---|
| because | kalimat (subjek + kata kerja) | The bus is late because the traffic is heavy. |
| because of | kata benda | The bus is late because of heavy traffic. |
| due to | kata benda | The bus is late due to heavy traffic. |

Bentuk pasif seperti **was delayed**, **was cancelled**, dan **has been postponed** membuat penjelasan terdengar netral: fokus pada kejadiannya, bukan menyalahkan orang.

:::tip
Hindari: *It's not my fault, the driver is always lazy.* Lebih baik: *The driver was delayed by heavy traffic. I'm very sorry for the wait.* Rumusnya: fakta + maaf + solusi.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'The flight was late ___ bad weather.',
          options: ['because', 'due to', 'so', 'although'],
          answerKey: 'B',
          explanation:
            '"Bad weather" = kata benda → "due to bad weather". "Because" butuh kalimat lengkap.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'The bus is late ___ the main road is closed.',
          options: ['due to', 'because of', 'despite', 'because'],
          answerKey: 'D',
          explanation:
            '"The main road is closed" = kalimat (subjek + kata kerja) → pakai "because".',
        },
        {
          type: 'ISIAN',
          prompt: 'The boat trip has been cancelled because ___ the storm.',
          answerKey: 'of',
          explanation:
            '"The storm" = kata benda → "because of the storm" (sama dengan "due to the storm").',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which explanation sounds like an excuse that blames someone?',
          options: [
            "It's not my fault. The driver is always lazy.",
            'The driver was delayed by heavy traffic.',
            'Allow me to explain why this situation occurred.',
            'Due to a technical issue, the lift is not working.',
          ],
          answerKey: 'A',
          explanation:
            'Menyalahkan orang lain terdengar seperti mencari alasan. Sampaikan fakta dengan netral.',
        },
        {
          type: 'ISIAN',
          prompt: 'Allow me to ___ why this situation occurred.',
          answerKey: 'explain',
          explanation: '"Allow me to explain…" = izinkan saya menjelaskan…',
        },
        {
          type: 'ISIAN',
          prompt:
            'To give you a bit of ___, the bus was delayed by heavy traffic.',
          answerKey: 'context',
          explanation:
            '"To give you a bit of context" = untuk memberi sedikit gambaran/latar belakang.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'The museum tour ___ because of a power cut.',
          options: ['cancelled', 'cancelling', 'was cancelled', 'is cancel'],
          answerKey: 'C',
          explanation:
            'Tur tidak membatalkan dirinya sendiri → pasif: "The museum tour was cancelled."',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'The hotel experienced a slight delay',
          explanation:
            '"The hotel experienced a slight delay." = Pihak hotel mengalami sedikit keterlambatan.',
        },
      ],
    },
    {
      code: 'EFT-307',
      title: 'Menawarkan Solusi',
      skill: 'VOCABULARY',
      cefr: 'B1',
      estMinutes: 6,
      body: `Setelah tamu tenang dan paham penyebabnya, tawarkan solusi yang konkret. Langkahnya:

1. Sampaikan apa yang bisa kamu lakukan sekarang.
2. Beri pilihan bila ada.
3. Pastikan tamu puas dengan solusinya.
4. Tindak lanjuti, lalu tutup dengan sopan.

## Menawarkan solusi & pilihan

:::phrases
- Here is what I can do right now to fix this. | Inilah yang bisa saya lakukan saat ini untuk memperbaikinya.
- Would you prefer to change rooms or have the air conditioner fixed tonight? | Apakah Anda lebih memilih pindah kamar atau AC-nya diperbaiki malam ini?
- I can arrange a taxi for you so you can join the group at the next stop. | Saya bisa mengatur taksi untuk Anda agar bisa menyusul rombongan di pemberhentian berikutnya.
- As a gesture of goodwill, the hotel will offer you a free dinner tonight. | Sebagai bentuk itikad baik, hotel akan memberi Anda makan malam gratis malam ini.
:::

## Memastikan & menutup

:::phrases
- Is that solution acceptable to you? | Apakah solusi itu dapat Anda terima?
- Is there anything else I can do for you? | Ada lagi yang bisa saya bantu?
- I'll check back with you in an hour to make sure everything is fine. | Saya akan menghubungi Anda lagi satu jam lagi untuk memastikan semuanya baik.
- Thank you for your patience and understanding. | Terima kasih atas kesabaran dan pengertian Anda.
:::

:::tip
Jangan menjanjikan hal di luar wewenangmu (misalnya pengembalian dana) sebelum dikonfirmasi hotel atau kantor. Lebih aman: *I will check with the hotel manager and get back to you within thirty minutes.*
:::

## Dalam tur

:::dialog
Mrs. Wilson (Tamu): So what can you do about the hot water?
Kamu (Tour Leader): Here is what I can do right now. Would you prefer to move to another room tonight, or wait thirty minutes for the technician?
Mrs. Wilson (Tamu): I'd rather move. I'm too tired to wait.
Kamu (Tour Leader): Of course. I'll arrange it with the front desk now. Is that solution acceptable to you?
Mrs. Wilson (Tamu): Yes, thank you.
Kamu (Tour Leader): Thank you for your patience. I'll check back with you in fifteen minutes.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            '"Would you prefer to change rooms or have the air conditioner fixed tonight?" What is the tour leader doing?',
          options: [
            'Explaining the cause',
            'Giving the guest a choice',
            "Asking for the guest's name",
            'Ending the conversation',
          ],
          answerKey: 'B',
          explanation:
            '"Would you prefer A or B?" = memberi tamu pilihan solusi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which sentence checks that the guest is happy with the solution?',
          options: [
            'Here is what I can do right now.',
            'Due to heavy traffic, the bus is late.',
            'Mind if I write this down?',
            'Is that solution acceptable to you?',
          ],
          answerKey: 'D',
          explanation:
            '"Is that solution acceptable to you?" = memastikan tamu menerima solusinya.',
        },
        {
          type: 'ISIAN',
          prompt: 'Here is what I can do right ___ to fix this.',
          answerKey: 'now',
          explanation: '"Right now" = saat ini juga.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "as a gesture of goodwill" mean?',
          options: [
            'Sebagai hukuman',
            'Sesuai aturan hotel',
            'Sebagai bentuk itikad baik',
            'Sebagai syarat tambahan',
          ],
          answerKey: 'C',
          explanation:
            '"As a gesture of goodwill" = sebagai bentuk itikad baik — biasanya untuk kompensasi kecil.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest asks for a refund. You are not sure the hotel will agree. What do you say?',
          options: [
            'I will check with the hotel manager and get back to you within thirty minutes.',
            "Don't worry, you'll get all your money back.",
            'Refunds are impossible.',
            "That's not my job.",
          ],
          answerKey: 'A',
          explanation:
            'Jangan menjanjikan hal di luar wewenangmu. Cek dulu, lalu beri kabar dengan batas waktu yang jelas.',
        },
        {
          type: 'ISIAN',
          prompt:
            "I'll ___ back with you in an hour to make sure everything is fine.",
          answerKey: 'check',
          explanation:
            '"Check back with someone" = menghubungi/menanyakan kembali untuk memastikan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'I can ___ a taxi for you so you can join the group at the next stop. (mengatur)',
          answerKey: 'arrange',
          acceptedAnswers: ['book', 'call', 'get', 'order'],
          explanation: '"Arrange a taxi" = mengatur/memesankan taksi.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Is there anything else I can do for you',
          explanation:
            '"Is there anything else I can do for you?" = Ada lagi yang bisa saya bantu?',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Thank you for your patience and understanding',
          explanation:
            '"Thank you for your patience and understanding." = Terima kasih atas kesabaran dan pengertian Anda.',
        },
      ],
    },
    {
      code: 'EFT-308',
      title: 'Studi Kasus: Bagasi yang Hilang',
      skill: 'READING',
      cefr: 'B1',
      estMinutes: 6,
      body: `Bab ini merangkum seluruh alur menangani keluhan, dari menyapa sampai menutup.

| Langkah | Contoh kalimat |
|---|---|
| Menyapa | Good afternoon, Madam. How can I help you today? |
| Mendengarkan | Please take your time, tell me all the details. |
| Berempati | I'm so sorry to hear that you are experiencing this issue. |
| Mencatat | Mind if I write this down? |
| Menenangkan | Please don't worry, I am here to help sort this out for you. |
| Menjelaskan | Due to heavy traffic, the bus was delayed. |
| Menawarkan solusi | Would you prefer a new room or a free dinner? |
| Menutup | Is there anything else I can do for you? |

:::tip
Tidak semua keluhan butuh delapan langkah. Keluhan kecil (misalnya handuk kurang) cukup: empati singkat, solusi, konfirmasi. Untuk keluhan besar seperti bagasi hilang, ikuti semua langkah dan laporkan ke kantor.
:::

Di kuis, baca cerita Dedi dan Mr. Tanaka di bandara, lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where does the problem happen?',
          options: [
            'At the baggage claim',
            'In the hotel lobby',
            'On the bus',
            'At a restaurant',
          ],
          answerKey: 'A',
          passage: LOST_LUGGAGE,
          explanation:
            '"At the baggage claim, Mr. Tanaka waits for a long time…"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why is Mr. Tanaka especially worried?',
          options: [
            'His passport is in the suitcase',
            'His camera is in the suitcase',
            'His medicine is in the suitcase',
            'His money is in the suitcase',
          ],
          answerKey: 'C',
          passage: LOST_LUGGAGE,
          explanation: '"…his medicine is inside it."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why did the suitcase not arrive?',
          options: [
            'Someone stole it',
            'Mr. Tanaka left it in Tokyo',
            'It was sent to another city',
            'Some bags were not loaded because the plane was too full',
          ],
          answerKey: 'D',
          passage: LOST_LUGGAGE,
          explanation:
            'Penjelasan maskapai: "…some bags were not loaded because the plane was too full."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does Dedi do right after listening to Mr. Tanaka?',
          options: [
            'He calls the hotel',
            'He shows empathy',
            'He offers a refund',
            'He blames the airline',
          ],
          answerKey: 'B',
          passage: LOST_LUGGAGE,
          explanation:
            '"I\'m so sorry to hear that. I see why you are concerned about this." = ungkapan empati.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How will the suitcase get to Mr. Tanaka?',
          options: [
            'He must collect it at the airport tomorrow',
            'Dedi will pick it up next week',
            'It will be delivered to the hotel tonight',
            'It will be sent back to Tokyo',
          ],
          answerKey: 'C',
          passage: LOST_LUGGAGE,
          explanation:
            '"…will arrive on the next flight and will be delivered to the hotel tonight."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which option does Mr. Tanaka choose?',
          options: [
            'A visit from the hotel doctor',
            'A new suitcase',
            'A taxi back to the airport',
            'Buying his medicine at a pharmacy',
          ],
          answerKey: 'D',
          passage: LOST_LUGGAGE,
          explanation: '"Mr. Tanaka chooses the pharmacy."',
        },
        {
          type: 'ISIAN',
          prompt:
            'Before dinner, Dedi ___ back with Mr. Tanaka to make sure everything is fine.',
          answerKey: 'checks',
          acceptedAnswers: ['checked'],
          passage: LOST_LUGGAGE,
          explanation:
            '"Check back with someone" = menghubungi kembali untuk tindak lanjut.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'When you handle a complaint, what should you do FIRST?',
          options: [
            'Greet the guest and listen',
            'Offer a solution',
            'Explain the cause',
            'Close the conversation',
          ],
          answerKey: 'A',
          explanation:
            'Alurnya: sapa & dengarkan → empati & catat → tenangkan → jelaskan → solusi → tutup.',
        },
      ],
    },
    {
      code: 'EFT-309',
      title: 'Menyimak: Keluhan Tamu',
      skill: 'LISTENING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Dengarkan percakapan antara tour leader dan tamu. Perhatikan tiga hal: apa masalahnya, apa penyebabnya, dan solusi apa yang dipilih.

## Kosakata keluhan

:::phrases
- The room hasn't been cleaned. | Kamarnya belum dibersihkan.
- The bus had a flat tyre. | Ban bus kempis.
- My luggage is missing. | Bagasi saya hilang.
- The food is too spicy for me. | Makanannya terlalu pedas untuk saya.
- The tour has been postponed. | Turnya ditunda.
- The bus is running late. | Busnya terlambat.
:::

:::tip
Jawaban pertanyaan "why" biasanya muncul setelah kata **because**, **due to**, atau **what happened was**. Dengarkan baik-baik bagian itu.
:::

Di kuis, tekan 🔊 untuk mendengar percakapan, lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is Mrs. Clark's problem?",
          options: [
            'The room is too noisy',
            "The room hasn't been cleaned",
            "The key doesn't work",
            'The shower is broken',
          ],
          answerKey: 'B',
          tts: ROOM_NOT_CLEANED,
          explanation:
            '"Our room hasn\'t been cleaned, and there are no fresh towels."',
        },
        {
          type: 'ISIAN',
          prompt: 'Housekeeping will clean the room within ___ minutes.',
          answerKey: 'thirty',
          acceptedAnswers: ['30'],
          tts: ROOM_NOT_CLEANED,
          explanation:
            '"…clean your room within thirty minutes." = dalam waktu 30 menit.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why is the bus late?',
          options: [
            'Heavy traffic',
            'The driver overslept',
            'The bus had a flat tyre',
            'The driver went to the wrong hotel',
          ],
          answerKey: 'C',
          tts: BUS_LATE,
          explanation:
            '"What happened was the bus had a flat tyre on the way here."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How long has Mr. Brown been waiting?',
          options: [
            'Fifteen minutes',
            'Thirty minutes',
            'Ten minutes',
            'Twenty minutes',
          ],
          answerKey: 'D',
          tts: BUS_LATE,
          explanation:
            '"We\'ve been waiting for twenty minutes already!" Lima belas menit adalah perkiraan bus tiba.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is wrong with Ms. Lopez's food?",
          options: [
            "It's too spicy",
            "It's too cold",
            "It's too salty",
            "It's too sweet",
          ],
          answerKey: 'A',
          tts: SPICY_FOOD,
          explanation: '"It\'s far too spicy for me." = terlalu pedas.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does Ms. Lopez choose?',
          options: [
            'Fried rice without chili',
            'Chicken soup',
            'Grilled fish',
            'Fried noodles',
          ],
          answerKey: 'B',
          tts: SPICY_FOOD,
          explanation:
            'Dedi menawarkan dua pilihan; Ms. Lopez menjawab "The chicken soup, please."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why was the volcano tour postponed?',
          options: [
            'The bus broke down',
            'It is a public holiday',
            'There were not enough guests',
            'Heavy rain',
          ],
          answerKey: 'D',
          tts: SCHEDULE_CHANGE,
          explanation:
            '"Due to heavy rain, the volcano tour has been postponed."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'When will the group visit the volcano?',
          options: [
            'Tomorrow morning',
            'Thursday afternoon',
            'Friday morning',
            'Saturday evening',
          ],
          answerKey: 'C',
          tts: SCHEDULE_CHANGE,
          explanation:
            '"We can visit the volcano on Friday morning instead." Besok mereka ke museum batik.',
        },
      ],
    },
    {
      code: 'EFT-310',
      title: 'Ucapkan: Menangani Keluhan',
      skill: 'SPEAKING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- Good morning, Sir. How can I help you today? | Selamat pagi, Pak. Ada yang bisa saya bantu hari ini?
- I'm listening, please go on. | Saya mendengarkan, silakan dilanjutkan.
- I completely understand how frustrating this must be for you. | Saya sangat memahami betapa menjengkelkannya hal ini bagi Anda.
- Mind if I write this down? | Apakah tidak apa-apa jika saya mencatat ini?
- I sincerely apologize for this inconvenience. | Saya memohon maaf yang sebesar-besarnya atas ketidaknyamanan ini.
- Here is what I can do right now to fix this. | Inilah yang bisa saya lakukan saat ini untuk memperbaikinya.
:::

:::tip
Saat menangani keluhan, bicara sedikit lebih pelan dari biasanya dengan nada tenang dan rendah. Tekankan kata kunci seperti **sorry**, **understand**, dan **help**.
:::`,
      items: [
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Good morning, Sir. How can I help you today',
          explanation: 'Sapaan sopan untuk tamu yang punya keluhan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: "I'm listening, please go on",
          explanation: 'Menunjukkan kamu menyimak tanpa memotong.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'I completely understand how frustrating this must be for you',
          explanation: 'Ungkapan empati.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Mind if I write this down',
          explanation: 'Meminta izin sebelum mencatat keluhan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'I sincerely apologize for this inconvenience',
          explanation: 'Permintaan maaf yang tulus untuk menenangkan tamu.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Here is what I can do right now to fix this',
          explanation: 'Membuka tawaran solusi yang konkret.',
        },
      ],
    },
  ],
};

// Dijalankan hanya bila dipanggil langsung — definisi bisa diimpor seed-tts-entries.
if (require.main === module)
  seedModule(def).catch((e) => {
    console.error(e);
    process.exit(1);
  });
