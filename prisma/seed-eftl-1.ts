// apps/api/prisma/seed-eftl-1.ts
import { KitModule, seedModule } from './seed-module-kit';

/**
 * Seed KONTEN — EFTL Modul 1 "Greetings & Small Talk" (DASAR·A2), dari PDF
 * klien "Modul 1 EFTL Samitago" (English for Tour Leaders). Konteks tetap
 * Tour Leader. 10 bab, kuis EFT-101..110; langsung LIVE.
 *
 * Alur: salam formal → salam santai → salam sesuai waktu → topik small talk →
 * topik yang dihindari → frasa & idiom → kosakata (2 bab) → menyimak
 * sambutan di bus (TTS) → ucapan.
 *
 * Jalankan: `npm run seed:eftl-1`. CREATE-ONLY (lihat seed-module-kit.ts).
 */

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const AIRPORT = `Rina is a tour leader. She is waiting with her group at the airport in Yogyakarta. The flight from Singapore was long, and some guests look tired.

Rina wants to start a friendly conversation. She smiles at Mr. and Mrs. Brown and asks, "How was your flight here?" Mr. Brown says it was long but comfortable. Then Rina asks, "Is this your first time visiting Indonesia?" Mrs. Brown says yes, and she is excited to try the local food.`;

const ON_THE_BUS = `On the bus, Dedi, a new tour leader, sits next to Ms. Clark. He wants to be friendly, so he asks, "How old are you? Are you married?"

Ms. Clark smiles politely but does not answer. She looks out of the window for the rest of the trip.`;

export const def: KitModule = {
  slug: 'eftl-1-greetings-small-talk',
  title: 'Greetings & Small Talk',
  summary:
    'Menyapa tamu tur dengan tepat dan membuka obrolan ringan yang nyaman.',
  topic: 'Greetings & Small Talk',
  level: 'DASAR',
  cefr: 'A2',
  status: 'LIVE',
  showInPath: true,
  chapters: [
    {
      code: 'EFT-101',
      title: 'Salam Formal untuk Tamu',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 4,
      body: `Sebagai Tour Leader, kalimat pertamamu menentukan kesan tamu. Saat membuka tur, menyambut rombongan, atau berbicara di depan grup, pakai salam formal.

## Frasa kunci

:::phrases
- Good morning, ladies and gentlemen. | Selamat pagi, Bapak dan Ibu sekalian.
- Good afternoon, ladies and gentlemen. | Selamat siang/sore, Bapak dan Ibu sekalian.
- Good evening, ladies and gentlemen. | Selamat malam, Bapak dan Ibu sekalian.
- A very warm welcome to all of you. | Sambutan yang sangat hangat untuk Anda sekalian.
- It's a pleasure to meet you all today. | Senang sekali bisa bertemu dengan Anda semua hari ini.
:::

:::tip
**Ladies and gentlemen** dipakai untuk menyapa grup. Untuk satu tamu, cukup **Good morning, Sir** atau **Good morning, Madam**.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): Good morning, ladies and gentlemen. A very warm welcome to all of you.
Mr. Lee (Tamu): Good morning! Thank you.
Kamu (Tour Leader): It's a pleasure to meet you all today.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which greeting is formal?',
          options: [
            'Yo, everyone!',
            'Good morning, ladies and gentlemen.',
            "What's up, guys?",
            'Hiya!',
          ],
          answerKey: 'B',
          explanation:
            '"Good morning, ladies and gentlemen." = salam formal untuk menyambut grup tamu.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "A very warm welcome to all of you" mean?',
          options: [
            'Selamat tinggal semuanya',
            'Sambutan yang sangat hangat untuk Anda sekalian',
            'Cuaca hari ini sangat hangat',
            'Silakan duduk semuanya',
          ],
          answerKey: 'B',
          explanation:
            '"A very warm welcome to all of you" = sambutan yang sangat hangat untuk Anda sekalian.',
        },
        {
          type: 'ISIAN',
          prompt: 'Good morning, ladies and ___.',
          answerKey: 'gentlemen',
          explanation: '"Ladies and gentlemen" = Bapak dan Ibu sekalian.',
        },
        {
          type: 'ISIAN',
          prompt: "It's a ___ to meet you all today.",
          answerKey: 'pleasure',
          explanation:
            '"It\'s a pleasure to meet you" = senang sekali bertemu dengan Anda.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'A very warm welcome to all of you',
          explanation:
            '"A very warm welcome to all of you." = Sambutan yang sangat hangat untuk Anda sekalian.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'It is 9 a.m. You are welcoming your tour group in the hotel lobby. What do you say?',
          options: [
            'Good night, everyone.',
            'Good morning, ladies and gentlemen.',
            'Hey, buddy!',
            'Good evening, ladies and gentlemen.',
          ],
          answerKey: 'B',
          explanation:
            'Pukul 9 pagi + menyambut grup tamu → salam formal "Good morning, ladies and gentlemen."',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: "It's a pleasure to meet you all today",
          explanation:
            '"It\'s a pleasure to meet you all today." = Senang sekali bisa bertemu dengan Anda semua hari ini.',
        },
        {
          type: 'ISIAN',
          prompt: 'A very warm ___ to all of you.',
          answerKey: 'welcome',
          explanation: '"Welcome" = sambutan / selamat datang.',
        },
      ],
    },
    {
      code: 'EFT-102',
      title: 'Salam Santai & Semi-Formal',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Tidak semua sapaan harus formal. Salam santai dipakai di antara teman, keluarga, atau kerabat untuk membangun suasana akrab. Dengan tamu, pilih versi **semi-formal**: ramah, tapi tetap sopan.

## Semi-formal untuk tamu

:::phrases
- Hello everyone, welcome to Bali! | Halo semuanya, selamat datang di Bali!
- Hi there! How are you doing today? | Halo! Bagaimana kabar Anda hari ini?
- Good to see you all ready for our tour! | Senang melihat Anda semua siap untuk tur kita!
:::

## Santai untuk teman & rekan

:::phrases
- Hey! / Hi there! / Hiya! | Hai!
- Morning! | Pagi! | versi santai "Good morning"
- What's up? / Sup? | Ada kabar apa? | "Sup" = singkatan "What's up"
- How's it going? | Gimana kabarnya?
- Hi, how's everything? | Hai, semuanya lancar?
- How have you been? | Apa kabar selama ini?
- Alright? | Baik-baik saja? | umum di Inggris
- Yo, Andi! / Hey, buddy! / Hey, pal! | Hai, kawan!
:::

:::tip
**Sup?** dan **Yo!** terlalu santai untuk tamu. Simpan untuk rekan sesama tim tur.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: '"Morning!" is a short, casual way to say…',
          options: [
            'Good morning',
            'Good night',
            'More, please',
            'Good afternoon',
          ],
          answerKey: 'A',
          explanation: '"Morning!" = versi santai dari "Good morning".',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: '"Sup?" is short for…',
          options: ["What's up?", 'Supper?', 'Sorry?', 'See you?'],
          answerKey: 'A',
          explanation: '"Sup?" = singkatan "What\'s up?" — sangat santai.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which greeting is best for welcoming tour guests in a friendly way?',
          options: [
            'Sup, guys?',
            'Yo!',
            'Hello everyone, welcome to Bali!',
            'Alright, pal?',
          ],
          answerKey: 'C',
          explanation:
            'Dengan tamu, pakai semi-formal: ramah tapi sopan — "Hello everyone, welcome to Bali!"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which greeting would you use with a close friend from your team?',
          options: [
            'Good evening, ladies and gentlemen.',
            'Hey, buddy!',
            'A very warm welcome to all of you.',
            "It's a pleasure to meet you.",
          ],
          answerKey: 'B',
          explanation: '"Hey, buddy!" = salam santai untuk teman akrab.',
        },
        {
          type: 'ISIAN',
          prompt: 'Hi there! How are you ___ today?',
          answerKey: 'doing',
          explanation:
            '"How are you doing today?" = Bagaimana kabar Anda hari ini?',
        },
        {
          type: 'ISIAN',
          prompt: 'Good to see you all ___ for our tour!',
          answerKey: 'ready',
          explanation:
            '"Good to see you all ready for our tour!" = Senang melihat Anda semua siap untuk tur kita!',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Hello everyone welcome to Bali',
          explanation:
            '"Hello everyone, welcome to Bali!" = Halo semuanya, selamat datang di Bali!',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "How have you been?" mean?',
          options: [
            'Kamu dari mana?',
            'Apa kabar selama ini?',
            'Sudah berapa lama di sini?',
            'Kamu mau ke mana?',
          ],
          answerKey: 'B',
          explanation:
            '"How have you been?" = Apa kabar selama ini? — untuk orang yang sudah lama tidak bertemu.',
        },
      ],
    },
    {
      code: 'EFT-103',
      title: 'Salam Sesuai Waktu',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 4,
      body: `Salam bahasa Inggris mengikuti jam. Salah pilih waktu terdengar janggal bagi tamu.

| Salam | Kapan dipakai |
|---|---|
| Good morning | sampai pukul 12.00 siang |
| Good afternoon | pukul 12.00 sampai sekitar 17.00/18.00 |
| Good evening | setelah sekitar 17.00/18.00 |
| Good night | saat berpamitan di malam hari / mau tidur |

## Good evening vs Good night

**Good evening** adalah salam *pembuka*: kamu baru bertemu dan interaksi masih berlanjut. Misalnya saat tiba di makan malam pukul 7 atau 8.

**Good night** adalah salam *penutup*: kamu berpamitan, biasanya karena akan tidur. Misalnya saat meninggalkan makan malam pukul 11.

:::dialog
Kamu (Tour Leader): Good evening, everyone! Welcome to our dinner.
Mrs. Smith (Tamu): Good evening! Everything looks delicious.
:::

:::tip
**Good night** tidak pernah dipakai untuk menyapa. Di akhir malam: *"Good night, everyone. See you at breakfast tomorrow!"*
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'It is 9 a.m. You meet your group in the hotel lobby. What do you say?',
          options: [
            'Good evening',
            'Good morning',
            'Good afternoon',
            'Good night',
          ],
          answerKey: 'B',
          explanation: '"Good morning" dipakai sampai pukul 12.00 siang.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'It is 2 p.m. at the museum. What do you say?',
          options: [
            'Good morning',
            'Good night',
            'Good afternoon',
            'Good evening',
          ],
          answerKey: 'C',
          explanation:
            '"Good afternoon" dipakai dari pukul 12.00 sampai sekitar 17.00/18.00.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'It is 7 p.m. You arrive at dinner with your guests. What do you say?',
          options: [
            'Good night',
            'Good evening',
            'Good afternoon',
            'Good morning',
          ],
          answerKey: 'B',
          explanation:
            'Baru bertemu di malam hari dan acara masih berlanjut → "Good evening".',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'It is 11 p.m. Your guests are going back to their rooms to sleep. What do you say?',
          options: [
            'Good evening!',
            'Good afternoon!',
            'Good night!',
            'Good morning!',
          ],
          answerKey: 'C',
          explanation: 'Berpamitan sebelum tidur → "Good night!"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: '"Good night" is used…',
          options: [
            'to greet someone when you arrive',
            'to say goodbye before going to sleep',
            'only before 12 noon',
            'to start a tour',
          ],
          answerKey: 'B',
          explanation:
            '"Good night" = salam penutup/berpamitan, bukan salam pembuka.',
        },
        {
          type: 'ISIAN',
          prompt: 'Until 12 noon, we say "Good ___."',
          answerKey: 'morning',
          explanation: '"Good morning" dipakai sampai pukul 12.00 siang.',
        },
        {
          type: 'ISIAN',
          prompt:
            'It is 8 p.m. The tour group arrives at the restaurant. "Good ___, everyone!"',
          answerKey: 'evening',
          explanation: 'Pukul 8 malam, baru tiba → "Good evening".',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'See you at breakfast tomorrow',
          explanation:
            '"Good night, everyone. See you at breakfast tomorrow!" = penutup yang ramah di akhir malam.',
        },
      ],
    },
    {
      code: 'EFT-104',
      title: 'Memilih Topik Small Talk',
      skill: 'READING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Small talk adalah obrolan ringan tentang topik yang tidak pribadi, tidak kontroversial, dan tidak serius. Gunanya mencairkan suasana, membangun hubungan baik, dan mengisi keheningan yang canggung — misalnya di bus atau saat menunggu check-in.

## Topik aman untuk tamu

:::phrases
- How was your flight here? | Bagaimana penerbangan Anda ke sini? | perjalanan
- Beautiful weather we're having today, isn't it? | Cuaca yang indah hari ini, bukan? | cuaca
- Is this your first time visiting Indonesia? | Apakah ini pertama kalinya Anda mengunjungi Indonesia? | kesan pertama
- Have you had a chance to try any local food yet? | Apakah Anda sudah sempat mencoba makanan lokal? | makanan
- Have you been anywhere interesting recently? | Apakah Anda baru-baru ini pergi ke tempat yang menarik? | jalan-jalan
:::

## Topik umum lainnya

:::phrases
- Did you hear about the new airport? | Apakah Anda sudah dengar soal bandara baru? | berita
- Did you catch the game last night? | Apakah Anda menonton pertandingan semalam? | olahraga
- Have you seen any good movies lately? | Ada film bagus yang Anda tonton akhir-akhir ini? | film
- Have you read any interesting books recently? | Ada buku menarik yang Anda baca baru-baru ini? | buku
- What do you like to do in your free time? | Apa yang suka Anda lakukan di waktu luang? | hobi
- Do you have any pets? | Apakah Anda punya hewan peliharaan? | hewan
- Are you planning to attend the festival this weekend? | Apakah Anda berencana datang ke festival akhir pekan ini? | acara lokal
:::

:::tip
Pertanyaan terbuka (*How…? What…?*) membuat tamu bercerita lebih banyak daripada pertanyaan ya/tidak.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where is Rina waiting with her group?',
          options: [
            'At the hotel',
            'At the airport',
            'On the bus',
            'At a restaurant',
          ],
          answerKey: 'B',
          passage: AIRPORT,
          explanation:
            '"She is waiting with her group at the airport in Yogyakarta."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is Rina's first small talk question?",
          options: [
            'Are you married?',
            'How was your flight here?',
            'How old are you?',
            'What is your job?',
          ],
          answerKey: 'B',
          passage: AIRPORT,
          explanation:
            'Rina membuka dengan topik aman: perjalanan — "How was your flight here?"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is Mrs. Brown excited about?',
          options: [
            'Trying the local food',
            'Going home',
            'Watching a movie',
            'Buying souvenirs',
          ],
          answerKey: 'A',
          passage: AIRPORT,
          explanation: '"…she is excited to try the local food."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why do people make small talk?',
          options: [
            'To discuss serious problems',
            'To break the silence and build a good relationship',
            'To ask personal questions',
            'To sell something',
          ],
          answerKey: 'B',
          explanation:
            'Small talk = mencairkan suasana, menjalin hubungan baik, mengisi keheningan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which is a safe small talk topic with a new guest?',
          options: [
            'Their salary',
            'Their religion',
            'The weather',
            'Their weight',
          ],
          answerKey: 'C',
          explanation:
            'Cuaca adalah topik paling aman — tidak pribadi dan tidak kontroversial.',
        },
        {
          type: 'ISIAN',
          prompt: 'Is this your first ___ visiting Indonesia?',
          answerKey: 'time',
          explanation:
            '"Is this your first time visiting…?" = Apakah ini pertama kalinya Anda mengunjungi…?',
        },
        {
          type: 'ISIAN',
          prompt: 'Have you had a ___ to try any local food yet?',
          answerKey: 'chance',
          explanation:
            '"Have you had a chance to…?" = Apakah Anda sudah sempat…?',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'How was your flight here',
          explanation:
            '"How was your flight here?" = Bagaimana penerbangan Anda ke sini?',
        },
      ],
    },
    {
      code: 'EFT-105',
      title: 'Topik yang Sebaiknya Dihindari',
      skill: 'READING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Beberapa pertanyaan yang biasa di Indonesia bisa terasa terlalu pribadi, mengganggu, atau tidak sopan bagi tamu dari budaya lain. Jangan **memulai** obrolan dengan topik berikut.

| Topik | Contoh yang dihindari | Alasannya |
|---|---|---|
| Pernikahan & keluarga | Are you married? / Why aren't you married yet? | Urusan pribadi |
| Agama & kepercayaan | What is your religion? | Sangat pribadi, bisa memicu perdebatan |
| Usia | How old are you? | Dianggap tidak sopan |
| Fisik & penampilan | How much do you weigh? | Bisa terasa menyinggung atau diskriminatif |
| Keuangan & pribadi | How much is your salary? / Do you own your home? | Melanggar batas pribadi |

:::tip
Kalau tamu sendiri yang bercerita soal keluarganya, kamu boleh menanggapi dengan ramah. Yang dihindari adalah **memulai** pertanyaannya.
:::

## Contoh menanggapi dengan aman

:::dialog
Mrs. Taylor (Tamu): I'm travelling with my two daughters this time.
Kamu (Tour Leader): That's lovely! Is this their first time in Indonesia?
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which question should a tour leader avoid?',
          options: [
            'How was your flight?',
            'Are you married?',
            'Have you tried the local food?',
            'Do you have any pets?',
          ],
          answerKey: 'B',
          explanation:
            'Status pernikahan & keluarga = urusan pribadi; jangan memulai pertanyaan ini.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why should you avoid asking "How old are you?"',
          options: [
            'It is too long',
            'It is often considered impolite',
            'It is a weather question',
            'Guests cannot answer it',
          ],
          answerKey: 'B',
          explanation:
            'Menanyakan usia sering dianggap tidak sopan atau terlalu ingin tahu.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which question is about private finances?',
          options: [
            'How much is your salary?',
            'Do you like hiking?',
            'How was the trip?',
            'Is it your first visit?',
          ],
          answerKey: 'A',
          explanation:
            'Gaji, kepemilikan rumah, dan keuangan melanggar batas pribadi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest looks tired after a long flight. Which is the best thing to say?',
          options: [
            'How much do you weigh?',
            "Why aren't you married yet?",
            "Hope the jet lag isn't hitting you too hard!",
            'What is your religion?',
          ],
          answerKey: 'C',
          explanation:
            'Tunjukkan perhatian tanpa masuk ke urusan pribadi: "Hope the jet lag isn\'t hitting you too hard!"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which topic is safe for small talk?',
          options: ['Religion', 'Salary', 'Age', 'Hobbies'],
          answerKey: 'D',
          explanation:
            'Hobi adalah topik ringan dan aman: "What do you like to do in your free time?"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why did Ms. Clark stop talking?',
          options: [
            'She was sleepy',
            'Dedi asked personal questions',
            'The bus was too noisy',
            'She did not speak English',
          ],
          answerKey: 'B',
          passage: ON_THE_BUS,
          explanation:
            'Dedi menanyakan usia dan status pernikahan — dua topik pribadi yang sebaiknya dihindari.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What could Dedi ask instead?',
          options: [
            'How much is your salary?',
            'What is your religion?',
            'Is this your first time visiting Indonesia?',
            'Do you own your home?',
          ],
          answerKey: 'C',
          passage: ON_THE_BUS,
          explanation:
            'Kesan pertama tentang Indonesia adalah topik aman untuk membuka obrolan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Lengkapi pertanyaan yang sebaiknya DIHINDARI: "How much is your ___?" (gaji)',
          answerKey: 'salary',
          explanation:
            '"Salary" = gaji. Pertanyaan soal gaji melanggar batas pribadi.',
        },
      ],
    },
    {
      code: 'EFT-106',
      title: 'Frasa & Idiom Small Talk',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Frasa siap pakai membuat obrolan terdengar alami dan penuh perhatian.

## Frasa perhatian

:::phrases
- Did you manage to get some rest on the way? | Apakah Anda sempat beristirahat selama di perjalanan?
- Hope the jet lag isn't hitting you too hard! | Semoga jet lag tidak membuat Anda terlalu lelah!
- Please don't hesitate to ask if you need anything. | Jangan ragu untuk bertanya jika Anda membutuhkan sesuatu.
:::

:::tip
**Jet lag** = rasa lelah karena perbedaan zona waktu setelah penerbangan jauh. Tamu dari Eropa atau Amerika hampir pasti mengalaminya.
:::

## Idiom populer

:::phrases
- break the ice | mencairkan suasana | Let's play a short game on the bus to break the ice.
- smooth sailing | berjalan lancar tanpa kendala | We hope our itinerary today will be smooth sailing.
- so far, so good | sejauh ini baik-baik saja | How is the trip so far? — So far, so good!
:::

:::dialog
Kamu (Tour Leader): Good morning, Mr. Garcia! How is the trip so far?
Mr. Garcia (Tamu): So far, so good! The hotel is lovely.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "break the ice" mean?',
          options: [
            'Memecahkan es batu',
            'Mencairkan suasana',
            'Membatalkan acara',
            'Mendinginkan minuman',
          ],
          answerKey: 'B',
          explanation:
            '"Break the ice" = mencairkan suasana, memulai obrolan supaya tidak kaku.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            '"We hope our itinerary today will be smooth sailing." This means the trip will…',
          options: [
            'go well without problems',
            'be on a boat',
            'be cancelled',
            'be very slow',
          ],
          answerKey: 'A',
          explanation:
            '"Smooth sailing" = berjalan lancar tanpa kendala — bukan soal kapal.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Your manager calls and asks, "How is the trip so far?" Everything is fine. What do you say?',
          options: [
            'Break the ice!',
            'So far, so good!',
            'Good night!',
            "Don't hesitate!",
          ],
          answerKey: 'B',
          explanation:
            '"So far, so good!" = sejauh ini semuanya baik-baik saja.',
        },
        {
          type: 'ISIAN',
          prompt: "Let's play a short game on the bus to break the ___.",
          answerKey: 'ice',
          explanation: '"Break the ice" = mencairkan suasana.',
        },
        {
          type: 'ISIAN',
          prompt: "Please don't ___ to ask if you need anything.",
          answerKey: 'hesitate',
          explanation: '"Don\'t hesitate to ask" = jangan ragu untuk bertanya.',
        },
        {
          type: 'ISIAN',
          prompt: "Hope the jet ___ isn't hitting you too hard!",
          answerKey: 'lag',
          explanation:
            '"Jet lag" = lelah karena perbedaan zona waktu setelah terbang jauh.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Did you manage to get some rest on the way',
          explanation:
            '"Did you manage to get some rest on the way?" = Apakah Anda sempat beristirahat selama di perjalanan?',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'What does "Please don\'t hesitate to ask if you need anything" mean?',
          options: [
            'Mohon jangan bertanya selama perjalanan',
            'Jangan ragu untuk bertanya jika Anda membutuhkan sesuatu',
            'Silakan tunggu sampai saya selesai bicara',
            'Apakah Anda membutuhkan sesuatu?',
          ],
          answerKey: 'B',
          explanation:
            'Kalimat ini menawarkan bantuan dengan ramah — bagus untuk menutup sambutan.',
        },
      ],
    },
    {
      code: 'EFT-107',
      title: 'Kosakata: Cuaca, Perjalanan & Makanan',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 5,
      body: `Tiga topik ini paling sering muncul dalam obrolan dengan tamu tur.

## Cuaca

:::phrases
- sunny / cloudy / rainy / windy | cerah / berawan / hujan / berangin
- drizzle | gerimis
- storm / thunder | badai / guntur
- humidity | kelembapan
- temperature | suhu
- forecast | prakiraan cuaca
:::

## Perjalanan

:::phrases
- destination | tujuan
- itinerary | rencana perjalanan
- journey | perjalanan
- sightseeing | berkeliling melihat-lihat
- accommodation | akomodasi
- luggage | bagasi
- reservation | reservasi
- guidebook | buku panduan
- excursion | wisata singkat
- souvenir | oleh-oleh
:::

## Makanan

:::phrases
- dish / cuisine | hidangan / masakan
- appetizer | hidangan pembuka
- main course | hidangan utama
- dessert | hidangan penutup
- beverage | minuman
- bill | tagihan
- utensils | peralatan makan
:::

:::tip
Cuaca adalah topik small talk paling aman: *"It's a bit cloudy today, but the forecast says it will be sunny this afternoon."*
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "drizzle" mean?',
          options: ['Badai', 'Gerimis', 'Guntur', 'Berangin'],
          answerKey: 'B',
          explanation: '"Drizzle" = gerimis, hujan ringan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "itinerary" mean?',
          options: ['Rencana perjalanan', 'Bagasi', 'Oleh-oleh', 'Paspor'],
          answerKey: 'A',
          explanation:
            '"Itinerary" = rencana perjalanan — daftar tempat dan jadwal tur.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "hidangan penutup"?',
          options: ['Appetizer', 'Main course', 'Dessert', 'Beverage'],
          answerKey: 'C',
          explanation:
            '"Dessert" = hidangan penutup, misalnya es krim atau kue.',
        },
        {
          type: 'ISIAN',
          prompt:
            "Please keep your ___ with you. Don't leave your bags on the bus.",
          answerKey: 'luggage',
          acceptedAnswers: ['baggage'],
          explanation: '"Luggage" / "baggage" = bagasi, tas bawaan.',
        },
        {
          type: 'ISIAN',
          prompt: 'The weather ___ says it will rain this afternoon.',
          answerKey: 'forecast',
          explanation: '"Weather forecast" = prakiraan cuaca.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Dinner is finished. You ask the waiter: "Excuse me, can we have the ___, please?"',
          options: ['menu', 'bill', 'recipe', 'dessert'],
          answerKey: 'B',
          explanation: '"Bill" = tagihan. "Can we have the bill, please?"',
        },
        {
          type: 'ISIAN',
          prompt: 'Bali is a popular tourist ___.',
          answerKey: 'destination',
          explanation: '"Destination" = tujuan wisata.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "humidity" mean?',
          options: ['Suhu', 'Kelembapan', 'Prakiraan cuaca', 'Berawan'],
          answerKey: 'B',
          explanation:
            '"Humidity" = kelembapan udara. Indonesia terkenal "hot and humid".',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'The forecast says it will be sunny',
          explanation:
            '"The forecast says it will be sunny." = Prakiraan cuaca bilang akan cerah.',
        },
      ],
    },
    {
      code: 'EFT-108',
      title: 'Kosakata: Berita, Olahraga, Hiburan & Hobi',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Saat obrolan berlanjut, tamu bisa bercerita soal berita, pertandingan, film, buku, hobi, atau hewan peliharaannya. Kenali kata-kata intinya.

## Berita

:::phrases
- news / headline | berita / judul utama
- breaking news | berita terkini
- announcement | pengumuman
- press conference | konferensi pers
- election / policy | pemilihan / kebijakan
:::

:::tip
Berita ringan boleh jadi bahan obrolan, tapi hindari berdebat soal politik atau agama dengan tamu.
:::

## Olahraga

:::phrases
- match / score | pertandingan / skor
- coach / referee | pelatih / wasit
- victory / defeat | kemenangan / kekalahan
- tournament / champion | turnamen / juara
- injury | cedera
:::

## Film & buku

:::phrases
- director / actor / actress | sutradara / aktor / aktris
- plot / episode / season | alur cerita / episode / musim
- review / rating | ulasan / penilaian
- spoiler | bocoran cerita
- cliff-hanger | akhir yang menggantung
- author / chapter / bestseller | penulis / bab / buku terlaris
:::

## Hobi & hewan peliharaan

:::phrases
- gardening / hiking / knitting | berkebun / mendaki / merajut
- photography / fishing | fotografi / memancing
- breed / grooming | ras / perawatan (hewan)
- vet / leash | dokter hewan / tali pengikat
- adopt | mengadopsi
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "referee" mean?',
          options: ['Pelatih', 'Wasit', 'Pemain', 'Penggemar'],
          answerKey: 'B',
          explanation: '"Referee" = wasit. "Coach" = pelatih.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "spoiler" mean?',
          options: [
            'Bocoran cerita',
            'Lagu tema',
            'Penayangan perdana',
            'Ulasan',
          ],
          answerKey: 'A',
          explanation:
            '"Spoiler" = bocoran cerita. "No spoilers, please!" = jangan bocorkan akhirnya!',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "berita terkini"?',
          options: ['Headline', 'Breaking news', 'Review', 'Announcement'],
          answerKey: 'B',
          explanation:
            '"Breaking news" = berita terkini yang baru saja terjadi.',
        },
        {
          type: 'ISIAN',
          prompt: 'Did you catch the ___ last night? Who won? (pertandingan)',
          answerKey: 'match',
          acceptedAnswers: ['game'],
          explanation: '"Match" / "game" = pertandingan.',
        },
        {
          type: 'ISIAN',
          prompt:
            "My dog is sick, so I'm taking him to the ___. (dokter hewan)",
          answerKey: 'vet',
          explanation: '"Vet" = dokter hewan (singkatan veterinarian).',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Who is the ___ of this book? (penulis)',
          options: ['director', 'author', 'referee', 'coach'],
          answerKey: 'B',
          explanation: '"Author" = penulis buku. "Director" = sutradara film.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "hiking" mean?',
          options: ['Memancing', 'Mendaki', 'Merajut', 'Berkebun'],
          answerKey: 'B',
          explanation: '"Hiking" = mendaki / berjalan jauh di alam.',
        },
        {
          type: 'ISIAN',
          prompt:
            "The episode ended with a ___. I can't wait for the next one! (akhir yang menggantung)",
          answerKey: 'cliff-hanger',
          acceptedAnswers: ['cliffhanger', 'cliff hanger'],
          explanation:
            '"Cliff-hanger" = akhir cerita yang menggantung dan bikin penasaran.',
        },
      ],
    },
    {
      code: 'EFT-109',
      title: 'Menyimak: Sambutan di Bus',
      skill: 'LISTENING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Sambutan pertama di bus menggabungkan semua yang sudah kamu pelajari. Susunannya:

1. Salam sesuai waktu
2. Sambutan hangat
3. Perkenalan diri
4. Small talk ringan
5. Tawaran bantuan

:::phrases
- Good afternoon, ladies and gentlemen. | Selamat siang, Bapak dan Ibu sekalian. | salam
- A very warm welcome to Yogyakarta! | Selamat datang di Yogyakarta! | sambutan
- My name is Rina, and I'll be your tour leader. | Nama saya Rina, saya tour leader Anda. | perkenalan
- Did you manage to get some rest on the plane? | Apakah Anda sempat beristirahat di pesawat? | small talk
- Please don't hesitate to ask if you need anything. | Jangan ragu untuk bertanya jika butuh sesuatu. | bantuan
:::

:::tip
Di mikrofon bus, bicara pelan dan jelas. Ulangi informasi penting seperti jam kumpul dan nama hotel.
:::

Di kuis, dengarkan rekaman sambutan Rina lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What time of day is it?',
          options: ['Morning', 'Afternoon', 'Evening', 'Night'],
          answerKey: 'B',
          tts: "Good afternoon, ladies and gentlemen. A very warm welcome to Yogyakarta! My name is Rina, and I'll be your tour leader for the next five days.",
          explanation:
            'Rina membuka dengan "Good afternoon" — siang/sore hari.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How long is the tour?',
          options: ['Two days', 'Three days', 'Five days', 'One week'],
          answerKey: 'C',
          tts: "My name is Rina, and I'll be your tour leader for the next five days.",
          explanation: '"…for the next five days" = selama lima hari ke depan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is Rina asking about?',
          options: [
            'Whether the guests rested on the plane',
            "The guests' ages",
            'Hotel prices',
            "The guests' families",
          ],
          answerKey: 'A',
          tts: "I hope the jet lag isn't hitting you too hard. Did you manage to get some rest on the plane?",
          explanation:
            '"Did you manage to get some rest on the plane?" = apakah sempat beristirahat di pesawat.',
        },
        {
          type: 'ISIAN',
          prompt: 'The weather today is ___ and a little humid.',
          answerKey: 'sunny',
          tts: 'The weather today is sunny and a little humid, so please drink plenty of water.',
          explanation: '"Sunny" = cerah. "Humid" = lembap.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'When will the group arrive at the first stop?',
          options: [
            'In ten minutes',
            'In thirty minutes',
            'In one hour',
            'Tomorrow morning',
          ],
          answerKey: 'B',
          tts: "Our first stop is the Sultan's Palace. We will arrive in about thirty minutes.",
          explanation:
            '"We will arrive in about thirty minutes" = sekitar 30 menit lagi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why does Rina want to play a game?',
          options: [
            'To break the ice',
            'To win a prize',
            'To check passports',
            'To wait for dinner',
          ],
          answerKey: 'A',
          tts: "Let's play a short game to break the ice. Tell the person next to you your name and your favourite food.",
          explanation: '"…to break the ice" = untuk mencairkan suasana.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does Rina offer at the end?',
          options: [
            'Free drinks',
            'Help if the guests need anything',
            'A shopping discount',
            'A hotel upgrade',
          ],
          answerKey: 'B',
          tts: "Please don't hesitate to ask if you need anything. Enjoy the ride!",
          explanation:
            '"Please don\'t hesitate to ask if you need anything" = tawaran bantuan.',
        },
      ],
    },
    {
      code: 'EFT-110',
      title: 'Ucapkan: Salam & Basa-basi',
      skill: 'SPEAKING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- Good morning, ladies and gentlemen. | Selamat pagi, Bapak dan Ibu sekalian.
- A very warm welcome to all of you. | Sambutan yang sangat hangat untuk Anda sekalian.
- It's a pleasure to meet you all today. | Senang sekali bisa bertemu dengan Anda semua hari ini.
- How was your flight here? | Bagaimana penerbangan Anda ke sini?
- Is this your first time visiting Indonesia? | Apakah ini pertama kalinya Anda mengunjungi Indonesia?
- Please don't hesitate to ask if you need anything. | Jangan ragu untuk bertanya jika Anda membutuhkan sesuatu.
:::

:::tip
Senyum saat menyapa — tamu bisa "mendengar" senyummu lewat nada suara. Beri jeda di koma.
:::`,
      items: [
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Good morning, ladies and gentlemen',
          explanation: 'Salam formal pembuka tur.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'A very warm welcome to all of you',
          explanation: 'Sambutan hangat untuk grup tamu.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: "It's a pleasure to meet you all today",
          explanation: 'Menyatakan senang bertemu tamu.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'How was your flight here',
          explanation: 'Small talk aman: perjalanan tamu.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Is this your first time visiting Indonesia',
          explanation: 'Small talk aman: kesan pertama.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: "Please don't hesitate to ask if you need anything",
          explanation: 'Menawarkan bantuan dengan ramah.',
        },
      ],
    },
  ],
};

// Dijalankan hanya bila dipanggil langsung — definisi diimpor seed-tts-entries.
if (require.main === module)
  seedModule(def).catch((e) => {
    console.error(e);
    process.exit(1);
  });
