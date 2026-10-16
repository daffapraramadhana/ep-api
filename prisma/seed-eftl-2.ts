// apps/api/prisma/seed-eftl-2.ts
import { KitModule, seedModule } from './seed-module-kit';

/**
 * Seed KONTEN — EFTL Modul 2 "Introductions" (DASAR·A2), dari PDF klien
 * "Modul 2 EFTL Samitago" (English for Tour Leaders). Konteks tetap Tour
 * Leader. 7 bab, kuis EFT-201..207; langsung LIVE.
 *
 * Alur: kosakata & frasa perkenalan → menyebut nama & pekerjaan → menjelaskan
 * peran kepada tamu → memperkenalkan orang lain (pemandu lokal, pengemudi,
 * tamu) → memperkenalkan perusahaan → menyimak perkenalan di bus (TTS) →
 * ucapan.
 *
 * Jalankan: `npm run seed:eftl-2`. CREATE-ONLY (lihat seed-module-kit.ts).
 */

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const RINA_INTRO = `Good morning, everyone. Allow me to introduce myself. My name is Rina Wulandari, and I will be your tour leader for this trip. You can call me Rina.

I have been working as a professional tour leader with Nusantara Travel for over five years. My main role is to ensure your trip runs smoothly, comfortably, and safely. I will be assisting you with hotel check-ins, transit logistics, and daily schedules.

If you have any questions or need special assistance, please feel free to reach out to me anytime. My room number is 105, and you can also find my phone number on your itinerary card.`;

const WELCOME_SPEECH = `Good evening, ladies and gentlemen. On behalf of Nusantara Travel, I would like to extend a warm welcome to all of you.

Nusantara Travel is a leading travel agency based in Jakarta. We specialize in tailored international group tours, and we are committed to providing you with an unforgettable travel experience.

For the next three days in Yogyakarta, we are operating in collaboration with our local partner, Jogja Heritage Tours. Their local guides know the temples and the old city very well.`;

export const def: KitModule = {
  slug: 'eftl-2-introductions',
  title: 'Introductions',
  summary:
    'Memperkenalkan diri, tim tur, tamu, dan perusahaan dengan percaya diri dan profesional.',
  topic: 'Introductions',
  level: 'DASAR',
  cefr: 'A2',
  status: 'LIVE',
  chapters: [
    {
      code: 'EFT-201',
      title: 'Kosakata & Frasa Perkenalan',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 5,
      body: `Perkenalan adalah momen pertama tamu mengenalmu. Perkenalan yang lancar dan percaya diri membuat tamu langsung merasa di tangan yang tepat. Mulailah dengan kata-kata kunci untuk menyebut peran setiap orang di tim tur.

## Kosakata kunci

:::phrases
- My name is Rina. | Nama saya Rina.
- tour leader | pemimpin tur | mendampingi rombongan sepanjang perjalanan
- tour guide | pemandu wisata lokal | memandu di satu kota atau objek wisata
- representative | perwakilan
- on behalf of | atas nama / mewakili
- co-guide / assistant | asisten pemandu
- driver / coach captain | pengemudi bus / kapten bus
:::

:::tip
**Tour leader** mendampingi rombongan dari awal sampai akhir perjalanan. **Tour guide** (pemandu lokal) biasanya hanya memandu di satu kota atau satu objek wisata.
:::

## Frasa pembuka

:::phrases
- Allow me to introduce myself. | Izinkan saya memperkenalkan diri saya.
- My name is Rina, and I will be your tour leader for this trip. | Nama saya Rina, dan saya akan menjadi Tour Leader Anda selama perjalanan ini.
- You can call me Rina. | Anda bisa memanggil saya Rina. | sebut nama panggilanmu
- It's a pleasure to meet you all. | Senang sekali bisa bertemu dengan Anda sekalian.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): Good morning, everyone. Allow me to introduce myself.
Mr. Lee (Tamu): Good morning!
Kamu (Tour Leader): My name is Rina Wulandari, and I will be your tour leader for this trip. You can call me Rina.
Mr. Lee (Tamu): Nice to meet you, Rina.
Kamu (Tour Leader): It's a pleasure to meet you all.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "tour guide" mean?',
          options: [
            'Pemandu wisata lokal',
            'Pemimpin tur',
            'Pengemudi bus',
            'Perwakilan perusahaan',
          ],
          answerKey: 'A',
          explanation:
            '"Tour guide" = pemandu wisata lokal. "Tour leader" = pemimpin tur yang mendampingi rombongan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "pengemudi bus / kapten bus"?',
          options: [
            'Representative',
            'Co-guide',
            'Coach captain',
            'Tour leader',
          ],
          answerKey: 'C',
          explanation:
            '"Coach captain" (atau "driver") = pengemudi bus. "Coach" di sini berarti bus pariwisata.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "on behalf of" mean?',
          options: [
            'Di belakang',
            'Bersama-sama dengan',
            'Sebagai ganti rugi',
            'Atas nama / mewakili',
          ],
          answerKey: 'D',
          explanation:
            '"On behalf of" = atas nama / mewakili, mis. "On behalf of Nusantara Travel…"',
        },
        {
          type: 'ISIAN',
          prompt: 'Allow me to ___ myself.',
          answerKey: 'introduce',
          explanation:
            '"Allow me to introduce myself." = Izinkan saya memperkenalkan diri saya.',
        },
        {
          type: 'ISIAN',
          prompt:
            'My name is Rina, and I will be your tour ___ for this trip. (pemimpin tur)',
          answerKey: 'leader',
          explanation:
            '"Tour leader" = pemimpin tur yang mendampingi rombongan sepanjang perjalanan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Your full name is Rina Wulandari, but you want the guests to use your short name. What do you say?',
          options: [
            'Call me later, Rina.',
            'You can call me Rina.',
            'Rina is calling you.',
            'My name calls Rina.',
          ],
          answerKey: 'B',
          explanation:
            '"You can call me Rina." = Anda bisa memanggil saya Rina — cara menyebut nama panggilan.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: "It's a pleasure to meet you all",
          explanation:
            '"It\'s a pleasure to meet you all." = Senang sekali bisa bertemu dengan Anda sekalian.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "perwakilan"?',
          options: ['Representative', 'Driver', 'Assistant', 'Leader'],
          answerKey: 'A',
          explanation:
            '"Representative" = perwakilan, mis. "I am a representative of Nusantara Travel."',
        },
      ],
    },
    {
      code: 'EFT-202',
      title: 'Menyebut Nama & Pekerjaan',
      skill: 'GRAMMAR',
      cefr: 'A2',
      estMinutes: 6,
      body: `Sebutkan nama dan informasi tambahan yang relevan, misalnya jabatan dan perusahaan, supaya orang lain mudah mengenalimu. Ini berlaku untuk tamu, staf hotel, maupun rekan dari perusahaan mitra.

## Memperkenalkan nama

:::phrases
- Hi, my name is Rina, and I'm a tour leader at Nusantara Travel. | Hai, nama saya Rina, dan saya tour leader di Nusantara Travel.
- Let me introduce myself. I'm Rina. | Perkenankan saya memperkenalkan diri. Saya Rina.
- Nice to meet you. My name is Rina. | Senang bertemu Anda. Nama saya Rina.
- I don't think we've met before. I'm Rina. | Sepertinya kita belum pernah bertemu. Saya Rina.
:::

## Menjelaskan pekerjaan

:::phrases
- I'm a tour leader at Nusantara Travel. | Saya tour leader di Nusantara Travel.
- I work in the travel industry. | Saya bekerja di industri perjalanan.
- Currently, my job is to lead group tours around Java. | Saat ini, pekerjaan saya adalah memimpin tur grup keliling Jawa.
- I work as a tour leader, and my role is to take care of our guests. | Saya bekerja sebagai tour leader, dan peran saya adalah mengurus tamu kami.
- My job title is tour leader, which essentially means I look after the group from start to finish. | Jabatan saya tour leader, yang intinya berarti saya menjaga rombongan dari awal sampai akhir.
- I work as a tour leader. I'm responsible for the group's daily schedule. | Saya bekerja sebagai tour leader. Saya bertanggung jawab atas jadwal harian rombongan.
- I work with Mr. Budi, our driver. | Saya bekerja bersama Pak Budi, pengemudi kita.
- I'm a freelancer in the tourism industry. | Saya pekerja lepas di industri pariwisata.
:::

## Pola kalimat

| Pola | Contoh |
|---|---|
| a / an + jabatan | I'm a tour leader. I'm an assistant guide. |
| at + perusahaan | I'm a tour leader at Nusantara Travel. |
| in + bidang | I work in the travel industry. |
| as + jabatan | I work as a tour leader. |
| with + orang | I work with Mr. Budi. |
| responsible for + kata benda | I'm responsible for the daily schedule. |
| my role is to + kata kerja | My role is to take care of our guests. |

:::tip
Jangan lupa **a/an** sebelum jabatan: *I'm **a** tour leader*, bukan *I'm tour leader*. Pakai **an** bila kata berikutnya berbunyi vokal: *an assistant guide*.
:::`,
      items: [
        {
          type: 'ISIAN',
          prompt: "I'm ___ tour leader at Nusantara Travel. (a / an)",
          answerKey: 'a',
          explanation:
            'Sebelum jabatan perlu artikel: "I\'m a tour leader." "Tour" berbunyi konsonan → "a".',
        },
        {
          type: 'ISIAN',
          prompt: 'I work ___ the travel industry.',
          answerKey: 'in',
          explanation:
            'Bidang/industri memakai "in": "I work in the travel industry."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'I work ___ a tour leader, and my role is to take care of our guests.',
          options: ['in', 'at', 'as', 'for'],
          answerKey: 'C',
          explanation:
            '"Work as + jabatan" = bekerja sebagai: "I work as a tour leader."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "I'm responsible ___ the group's daily schedule.",
          options: ['to', 'with', 'on', 'for'],
          answerKey: 'D',
          explanation:
            '"Responsible for" = bertanggung jawab atas: "I\'m responsible for the group\'s daily schedule."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which sentence is correct?',
          options: [
            'I work as an assistant guide.',
            'I am assistant guide at Nusantara Travel.',
            'I am a assistant guide.',
            'I work in an assistant guide.',
          ],
          answerKey: 'A',
          explanation:
            '"Work as" + "an" (karena "assistant" berbunyi vokal) + jabatan → "I work as an assistant guide."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'You meet the hotel manager for the first time. Which opening is the most natural?',
          options: [
            'Who are you? I am Rina.',
            "I don't think we've met before. I'm Rina.",
            "We don't meet before. I'm Rina.",
            'I think we never meet. I am Rina.',
          ],
          answerKey: 'B',
          explanation:
            "\"I don't think we've met before. I'm Rina.\" = Sepertinya kita belum pernah bertemu. Saya Rina.",
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'My job title is tour leader, which essentially ___ I look after the group from start to finish.',
          options: ['meaning', 'means', 'mean', 'to mean'],
          answerKey: 'B',
          explanation:
            '"Which" merujuk pada satu hal (jabatan) → kata kerja tunggal "means".',
        },
        {
          type: 'ISIAN',
          prompt: 'I work ___ Mr. Budi, our driver. (bersama)',
          answerKey: 'with',
          explanation: '"Work with + orang" = bekerja bersama seseorang.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: "I'm a tour leader at Nusantara Travel",
          explanation:
            '"I\'m a tour leader at Nusantara Travel." = Saya tour leader di Nusantara Travel.',
        },
      ],
    },
    {
      code: 'EFT-203',
      title: 'Menjelaskan Peranmu kepada Tamu',
      skill: 'READING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Tamu ingin tahu siapa kamu dan apa yang akan kamu lakukan untuk mereka. Sebutkan pengalaman, peran, dan tugasmu dengan jelas — ini membangun kepercayaan dan kredibilitas sejak hari pertama.

## Frasa kunci

:::phrases
- I have been working as a professional tour leader for over five years. | Saya telah bekerja sebagai Tour Leader profesional selama lebih dari lima tahun. | pengalaman
- My main role is to ensure your trip runs smoothly, comfortably, and safely. | Peran utama saya adalah memastikan perjalanan Anda berjalan lancar, nyaman, dan aman. | peran
- I will be assisting you with hotel check-ins, transit logistics, and daily schedules. | Saya akan membantu Anda dalam proses check-in hotel, logistik transit, dan jadwal harian. | tugas
- If you have any questions or need special assistance, please feel free to reach out to me anytime. | Jika Anda memiliki pertanyaan atau membutuhkan bantuan khusus, jangan ragu untuk menghubungi saya kapan saja. | tawaran bantuan
:::

:::tip
**I have been working … for over five years** menunjukkan pengalaman yang masih berlanjut sampai sekarang. Pakai **for** + lama waktu (*for five years*) dan **since** + titik waktu (*since 2019*).
:::

Di kuis, baca perkenalan Rina di lobi hotel lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How long has Rina been working as a tour leader?',
          options: [
            'Less than one year',
            'About two years',
            'Exactly five years',
            'More than five years',
          ],
          answerKey: 'D',
          passage: RINA_INTRO,
          explanation: '"…for over five years" = selama lebih dari lima tahun.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What name should the guests use for her?',
          options: ['Rina', 'Wulandari', 'Ms. Nusantara', 'Madam Leader'],
          answerKey: 'A',
          passage: RINA_INTRO,
          explanation: '"You can call me Rina." = nama panggilannya Rina.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which task does Rina NOT mention?',
          options: [
            'Hotel check-ins',
            'Transit logistics',
            'Buying souvenirs',
            'Daily schedules',
          ],
          answerKey: 'C',
          passage: RINA_INTRO,
          explanation:
            'Rina menyebut check-in hotel, logistik transit, dan jadwal harian — bukan belanja oleh-oleh.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "Where can the guests find Rina's phone number?",
          options: [
            'On the bus window',
            'On their itinerary card',
            'At the hotel reception',
            'On the company website',
          ],
          answerKey: 'B',
          passage: RINA_INTRO,
          explanation:
            '"…you can also find my phone number on your itinerary card."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'What does "My main role is to ensure your trip runs smoothly" mean?',
          options: [
            'Saya akan mengemudikan bus dengan pelan',
            'Perjalanan Anda mungkin akan terlambat',
            'Tugas saya hanya mengecek tiket Anda',
            'Peran utama saya adalah memastikan perjalanan Anda berjalan lancar',
          ],
          answerKey: 'D',
          explanation:
            '"Ensure" = memastikan; "runs smoothly" = berjalan lancar.',
        },
        {
          type: 'ISIAN',
          prompt:
            'I have been working as a professional tour leader ___ over five years.',
          answerKey: 'for',
          explanation:
            '"For" + lama waktu: "for over five years" = selama lebih dari lima tahun.',
        },
        {
          type: 'ISIAN',
          prompt: 'Please feel ___ to reach out to me anytime.',
          answerKey: 'free',
          explanation:
            '"Feel free to…" = jangan ragu untuk… "Reach out to me" = hubungi saya.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'I will be assisting you with hotel check-ins',
          explanation:
            '"I will be assisting you with hotel check-ins." = Saya akan membantu Anda dalam proses check-in hotel.',
        },
      ],
    },
    {
      code: 'EFT-204',
      title: 'Memperkenalkan Pemandu, Pengemudi & Tamu',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Tour Leader juga memperkenalkan anggota tim (pemandu lokal, asisten, pengemudi) dan mempertemukan sesama tamu. Sebutkan **nama + peran + apa yang akan mereka lakukan**, supaya tamu tahu kepada siapa harus bertanya.

## Memperkenalkan pemandu lokal & pengemudi

:::phrases
- I would like to introduce our local guide, Ms. Dewi, who will share rich historical insights with us today. | Saya ingin memperkenalkan pemandu lokal kita, Ibu Dewi, yang akan membagikan wawasan sejarah yang kaya dengan kita hari ini.
- This is Mr. Budi, our professional driver, who will be taking us safely across the city. | Ini adalah Bapak Budi, pengemudi profesional kita yang akan membawa kita dengan aman berkeliling kota.
:::

## Memperkenalkan sesama tamu & rekan

:::phrases
- Everyone, I'd like you to meet Mr. Tanaka from Japan. | Semuanya, saya ingin memperkenalkan Anda kepada Bapak Tanaka dari Jepang.
- Have you met our assistant guide, Andi? | Apakah Anda sudah bertemu dengan asisten pemandu kita, Andi?
- Mr. Tanaka, this is Mr. Lee from Seoul. | Pak Tanaka, ini Pak Lee dari Seoul.
- Nice to meet you. / Nice to meet you, too. | Senang bertemu Anda. / Senang bertemu Anda juga.
:::

:::tip
**Mr.** untuk pria, **Mrs.** untuk wanita yang sudah menikah, **Ms.** untuk wanita tanpa perlu tahu status pernikahannya — pilihan paling aman untuk tamu wanita.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): Mr. Lee, have you met our assistant guide, Andi?
Mr. Lee (Tamu): Not yet. Hello, Andi!
Kamu (Tour Leader): Andi will help us with the tickets and the luggage today.
Mr. Lee (Tamu): Great. Thank you both.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'You want to introduce the local guide to your group. Which sentence is best?',
          options: [
            'This is local guide of us, Ms. Dewi.',
            'Please introduce, Ms. Dewi is local guide.',
            'I would like to introduce our local guide, Ms. Dewi.',
            'I would like to introduce me our local guide, Ms. Dewi.',
          ],
          answerKey: 'C',
          explanation:
            '"I would like to introduce our local guide, Ms. Dewi." = Saya ingin memperkenalkan pemandu lokal kita, Ibu Dewi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Who usually "shares rich historical insights" with the group at a temple?',
          options: [
            'The local guide',
            'The driver',
            'The hotel receptionist',
            'The guests',
          ],
          answerKey: 'A',
          explanation:
            'Pemandu lokal (local guide) menjelaskan sejarah dan cerita di balik objek wisata.',
        },
        {
          type: 'ISIAN',
          prompt: "Everyone, I'd like you to ___ Mr. Tanaka from Japan.",
          answerKey: 'meet',
          explanation:
            '"I\'d like you to meet…" = saya ingin memperkenalkan Anda kepada…',
        },
        {
          type: 'ISIAN',
          prompt: '___ you met our assistant guide, Andi?',
          answerKey: 'Have',
          explanation:
            '"Have you met…?" = Apakah Anda sudah bertemu dengan…? (present perfect).',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            "Which title is safest for a female guest when you don't know if she is married?",
          options: ['Mrs.', 'Ms.', 'Mr.', 'Sir'],
          answerKey: 'B',
          explanation:
            '"Ms." dipakai untuk wanita tanpa perlu tahu status pernikahannya.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "This is Mr. Budi, our professional driver" mean?',
          options: [
            'Ini Bapak Budi, pemandu lokal kita',
            'Bapak Budi sedang mencari pengemudi',
            'Ini mobil milik Bapak Budi',
            'Ini Bapak Budi, pengemudi profesional kita',
          ],
          answerKey: 'D',
          explanation: '"Driver" = pengemudi. "Local guide" = pemandu lokal.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'I would like to introduce our local guide',
          explanation:
            '"I would like to introduce our local guide." = Saya ingin memperkenalkan pemandu lokal kita.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Mr. Tanaka from Japan and Mr. Lee from Korea have not met yet. What do you say to Mr. Tanaka?',
          options: [
            'Mr. Tanaka, this is Mr. Lee from Seoul.',
            'Mr. Tanaka, who is he?',
            'Mr. Tanaka, you know Mr. Lee, right?',
            'Mr. Tanaka, meet me Mr. Lee.',
          ],
          answerKey: 'A',
          explanation:
            '"Mr. Tanaka, this is Mr. Lee from Seoul." = cara sederhana mempertemukan dua tamu.',
        },
      ],
    },
    {
      code: 'EFT-205',
      title: 'Memperkenalkan Perusahaan',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Di depan tamu, kamu mewakili perusahaan. Saat pidato sambutan atau rapat dengan mitra, perkenalkan perusahaanmu dengan bahasa yang profesional.

## Frasa kunci

:::phrases
- On behalf of Nusantara Travel, I would like to extend a warm welcome to all of you. | Atas nama Nusantara Travel, saya ingin mengucapkan selamat datang yang hangat kepada Anda sekalian.
- Nusantara Travel is a leading travel agency specializing in tailored international group tours. | Nusantara Travel adalah agen perjalanan terkemuka yang mengkhususkan diri dalam tur kelompok internasional yang disesuaikan.
- We at Nusantara Travel are committed to providing you with an unforgettable travel experience. | Kami di Nusantara Travel berkomitmen untuk memberikan Anda pengalaman perjalanan yang tak terlupakan.
- Today, we are operating in collaboration with our local partner, Jogja Heritage Tours. | Hari ini, kami beroperasi bekerja sama dengan mitra lokal kami, Jogja Heritage Tours.
:::

## Kosakata

:::phrases
- extend a warm welcome | mengucapkan selamat datang yang hangat
- leading | terkemuka
- travel agency | agen perjalanan
- specializing in | mengkhususkan diri dalam
- tailored | disesuaikan dengan kebutuhan tamu
- committed to | berkomitmen untuk
- unforgettable | tak terlupakan
- in collaboration with | bekerja sama dengan
- local partner | mitra lokal
:::

:::tip
Setelah **committed to** dan **specializing in**, kata kerja memakai bentuk **-ing**: *committed to providing*, bukan *committed to provide*.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "On behalf of Nusantara Travel" mean?',
          options: [
            'Di belakang kantor Nusantara Travel',
            'Atas nama Nusantara Travel',
            'Demi keuntungan Nusantara Travel',
            'Setelah bergabung dengan Nusantara Travel',
          ],
          answerKey: 'B',
          explanation:
            '"On behalf of" = atas nama / mewakili. Kamu berbicara mewakili perusahaan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'We at Nusantara Travel are committed to ___ you with an unforgettable travel experience.',
          answerKey: 'providing',
          explanation:
            '"Committed to" + kata kerja -ing → "committed to providing".',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'In "tailored international group tours", "tailored" means…',
          options: [
            'Murah',
            'Singkat',
            'Disesuaikan dengan kebutuhan',
            'Penuh risiko',
          ],
          answerKey: 'C',
          explanation:
            '"Tailored" = disesuaikan dengan kebutuhan tamu, seperti baju yang dijahit khusus.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Today, we are operating in ___ with our local partner, Jogja Heritage Tours.',
          answerKey: 'collaboration',
          acceptedAnswers: ['partnership', 'cooperation'],
          explanation:
            '"In collaboration with" = bekerja sama dengan. "In partnership with" juga benar.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Who is the local partner?',
          options: [
            'Jogja Heritage Tours',
            'Nusantara Travel',
            'Jakarta City Tours',
            'Yogyakarta Grand Hotel',
          ],
          answerKey: 'A',
          passage: WELCOME_SPEECH,
          explanation:
            '"…our local partner, Jogja Heritage Tours." Nusantara Travel adalah perusahaan tour leader sendiri.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How long will the group stay in Yogyakarta?',
          options: ['One day', 'Two days', 'One week', 'Three days'],
          answerKey: 'D',
          passage: WELCOME_SPEECH,
          explanation: '"For the next three days in Yogyakarta…"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which sentence is correct?',
          options: [
            'We are committed to provide the best service.',
            'We committed for providing the best service.',
            'We are committed to providing the best service.',
            'We are commit to providing the best service.',
          ],
          answerKey: 'C',
          explanation:
            '"Be committed to" + kata kerja -ing: "We are committed to providing…"',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Nusantara Travel is a leading travel agency',
          explanation:
            '"Nusantara Travel is a leading travel agency." = Nusantara Travel adalah agen perjalanan terkemuka.',
        },
      ],
    },
    {
      code: 'EFT-206',
      title: 'Menyimak: Perkenalan di Bus',
      skill: 'LISTENING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Perkenalan pertama di bus menggabungkan semua yang sudah kamu pelajari. Susunannya:

1. Salam dan memperkenalkan diri
2. Nama panggilan
3. Pengalaman dan peran
4. Perusahaan
5. Memperkenalkan tim dan sesama tamu
6. Tawaran bantuan

:::phrases
- Allow me to introduce myself. | Izinkan saya memperkenalkan diri saya. | diri
- You can call me Dika. | Anda bisa memanggil saya Dika. | nama panggilan
- I have been working as a tour leader for over eight years. | Saya sudah bekerja sebagai tour leader selama lebih dari delapan tahun. | pengalaman
- On behalf of Nusantara Travel, welcome to Yogyakarta. | Atas nama Nusantara Travel, selamat datang di Yogyakarta. | perusahaan
- I would like to introduce our local guide, Ms. Sari. | Saya ingin memperkenalkan pemandu lokal kita, Ibu Sari. | tim
- Please feel free to reach out to me anytime. | Jangan ragu untuk menghubungi saya kapan saja. | bantuan
:::

:::tip
Di mikrofon bus, sebut nama dengan pelan dan jelas, lalu ulangi nama panggilanmu. Tamu baru mendengar banyak nama asing di hari pertama.
:::

Di kuis, dengarkan rekaman perkenalan Dika lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What can the guests call the tour leader?',
          options: ['Andika Pratama', 'Dika', 'Mr. Pratama', 'Andi'],
          answerKey: 'B',
          tts: 'Good morning, everyone. Allow me to introduce myself. My name is Andika Pratama, and I will be your tour leader for this trip. You can call me Dika.',
          explanation: '"You can call me Dika." = nama panggilannya Dika.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which company does the tour leader represent?',
          options: [
            'Jogja Heritage Tours',
            'Garuda Holidays',
            'Java Coach Services',
            'Nusantara Travel',
          ],
          answerKey: 'D',
          tts: 'On behalf of Nusantara Travel, I would like to extend a warm welcome to all of you. We are committed to providing you with an unforgettable travel experience.',
          explanation:
            '"On behalf of Nusantara Travel…" = Dika berbicara atas nama Nusantara Travel.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How long has Dika been working as a tour leader?',
          options: [
            'About three years',
            'Exactly five years',
            'Over eight years',
            'Eighteen years',
          ],
          answerKey: 'C',
          tts: 'I have been working as a professional tour leader for over eight years, so you are in good hands.',
          explanation:
            '"…for over eight years" = selama lebih dari delapan tahun.',
        },
        {
          type: 'ISIAN',
          prompt: "The local guide's name is Ms. ___.",
          answerKey: 'Sari',
          tts: 'I would like to introduce our local guide, Ms. Sari, who will share rich historical insights with us at Prambanan Temple today.',
          explanation:
            '"…our local guide, Ms. Sari…" = pemandu lokalnya Ibu Sari.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: "What is the driver's name?",
          options: ['Mr. Joko', 'Mr. Lee', 'Mr. Budi', 'Dika'],
          answerKey: 'A',
          tts: "Dika: Mr. Lee, have you met our driver yet?\nMr. Lee: No, not yet. What's his name?\nDika: This is Mr. Joko. He will be taking us safely across the city.\nMr. Lee: Nice to meet you, Mr. Joko.",
          explanation:
            '"This is Mr. Joko. He will be taking us safely across the city." Mr. Lee adalah tamu.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What will Dika help the guests with?',
          options: [
            'Shopping and souvenirs',
            'Flights home and visas',
            'Hotel check-ins and daily schedules',
            'Cooking classes',
          ],
          answerKey: 'C',
          tts: 'My main role is to ensure your trip runs smoothly, comfortably, and safely. I will be assisting you with hotel check-ins, transit logistics, and daily schedules.',
          explanation:
            '"I will be assisting you with hotel check-ins, transit logistics, and daily schedules."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where is Mr. Tanaka from?',
          options: ['Tokyo', 'Osaka', 'Seoul', 'Singapore'],
          answerKey: 'B',
          tts: "Dika: Everyone, I'd like you to meet Mr. Tanaka from Osaka. He is travelling with us for the first time.\nMr. Tanaka: Hello, everyone. It's a pleasure to meet you all.",
          explanation: '"…Mr. Tanaka from Osaka." Osaka ada di Jepang.',
        },
        {
          type: 'ISIAN',
          prompt:
            'If you have any questions, please feel free to reach out to me ___.',
          answerKey: 'anytime',
          acceptedAnswers: ['any time'],
          tts: 'If you have any questions or need special assistance, please feel free to reach out to me anytime. Enjoy the ride!',
          explanation: '"Reach out to me anytime" = hubungi saya kapan saja.',
        },
      ],
    },
    {
      code: 'EFT-207',
      title: 'Ucapkan: Perkenalan',
      skill: 'SPEAKING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- Allow me to introduce myself. | Izinkan saya memperkenalkan diri saya.
- My name is Rina, and I will be your tour leader for this trip. | Nama saya Rina, dan saya akan menjadi Tour Leader Anda selama perjalanan ini.
- You can call me Rina. | Anda bisa memanggil saya Rina.
- I have been working as a professional tour leader for over five years. | Saya telah bekerja sebagai Tour Leader profesional selama lebih dari lima tahun.
- I would like to introduce our local guide, Ms. Dewi. | Saya ingin memperkenalkan pemandu lokal kita, Ibu Dewi.
- On behalf of Nusantara Travel, I would like to extend a warm welcome to all of you. | Atas nama Nusantara Travel, saya ingin mengucapkan selamat datang yang hangat kepada Anda sekalian.
:::

:::tip
Ucapkan namamu pelan-pelan dan beri jeda sebelum dan sesudahnya. Tekan kata penting seperti **tour leader**, **local guide**, dan nama perusahaan.
:::`,
      items: [
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Allow me to introduce myself',
          explanation: 'Pembuka perkenalan diri yang sopan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'My name is Rina, and I will be your tour leader for this trip',
          explanation: 'Menyebut nama dan peran sebagai tour leader.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'You can call me Rina',
          explanation: 'Menyebut nama panggilan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'I have been working as a professional tour leader for over five years',
          explanation: 'Menyebut pengalaman untuk membangun kepercayaan tamu.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'I would like to introduce our local guide, Ms. Dewi',
          explanation: 'Memperkenalkan pemandu lokal kepada rombongan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'On behalf of Nusantara Travel, I would like to extend a warm welcome to all of you',
          explanation: 'Sambutan resmi atas nama perusahaan.',
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
