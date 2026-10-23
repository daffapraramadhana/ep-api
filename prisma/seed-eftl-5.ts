// apps/api/prisma/seed-eftl-5.ts
import { KitModule, seedModule } from './seed-module-kit';

/**
 * Seed KONTEN — EFTL Modul 5 "Explaining Tourist Attractions" (MENENGAH·B1),
 * dari PDF klien "Modul 5 EFTL Samitago" (English for Tour Leaders). Konteks
 * tetap Tour Leader di objek wisata Indonesia. 10 bab, kuis EFT-501..510;
 * langsung LIVE.
 *
 * Alur: kosakata alam (2 bab: daratan, perairan) → objek budaya → kata sifat
 * deskriptif → kategori & memperkenalkan objek → memberi informasi (sejarah,
 * daya tarik) → mengarahkan tamu di lokasi → info praktis yang tepat →
 * menyimak penjelasan di lokasi (TTS) → ucapan.
 *
 * Jalankan: `npm run seed:eftl-5`. CREATE-ONLY (lihat seed-module-kit.ts).
 */

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const YOGYA_DAY = `Today, Andi is taking his group around Yogyakarta. As the bus turns onto a busy street, he picks up the microphone.

"On our right, we have one of the most iconic historical sites in the city: Fort Vredeburg. It was built by the Dutch in the 18th century, and today it is a museum.

Up next on our itinerary is Borobudur, an architectural wonder and a must-see cultural heritage site. After lunch, we will drive to a picturesque cultural village, where you can watch local people make batik. We will finish the day at a scenic viewpoint to enjoy the sunset."`;

const ULUWATU = `The bus stops at the parking area of Uluwatu Temple. Before the guests get off, Wayan gives a short briefing.

"Before we enter, please put on the sarong and sash that I will give you. Feel free to walk around the temple grounds, but please stay on the designated paths, because the cliff is very high. Please be aware that the inner area of the temple is only for people who come to pray.

If you want to take the best photos, head over to the viewpoint along the cliff path. Please hold on to your sunglasses and hats, because the monkeys here sometimes grab them. You can find souvenir shops and toilets near the main exit."`;

export const def: KitModule = {
  slug: 'eftl-5-tourist-attractions',
  title: 'Explaining Tourist Attractions',
  summary:
    'Menyebut, menggambarkan, dan menjelaskan objek wisata kepada tamu — dari kosakata alam sampai info praktis di lokasi.',
  topic: 'Explaining Tourist Attractions',
  level: 'MENENGAH',
  cefr: 'B1',
  status: 'LIVE',
  chapters: [
    {
      code: 'EFT-501',
      title: 'Kosakata: Hutan, Gunung & Bentang Alam',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Saat memperkenalkan objek wisata alam, tamu ingin tahu *apa* yang sedang mereka lihat. Kosakata bentang alam membantumu menyebutnya dengan tepat.

## Hutan & bentang alam

:::phrases
- forest | hutan
- rainforest | hutan hujan tropis | Bukit Lawang, Sumatera Utara
- jungle | hutan belantara, rimba
- mangrove | hutan bakau
- savanna | sabana | padang rumput dengan pohon-pohon tersebar
- desert | gurun pasir
- oasis | oasis | mata air di tengah gurun
- cave | gua
- meadow / grassland | padang rumput
:::

## Gunung & dataran

:::phrases
- mountain / hill | gunung / bukit
- volcano | gunung berapi | Bromo, Batur, Merapi
- crater | kawah
- valley | lembah
- canyon / gorge | jurang / ngarai | Ngarai Sianok, Bukittinggi
- cliff | tebing | Pura Uluwatu berdiri di atas tebing
- plateau | dataran tinggi, plato | Dataran Tinggi Dieng
:::

:::tip
**Hill** lebih rendah dari **mountain**. **Volcano** adalah gunung berapi, dan **crater** adalah kawah di puncaknya.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): On our left is Mount Bromo, an active volcano.
Ms. Novak (Tamu): Can we walk up to the crater?
Kamu (Tour Leader): Yes, we will climb the steps to the crater rim tomorrow morning.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "valley" mean?',
          options: ['Bukit', 'Tebing', 'Lembah', 'Gua'],
          answerKey: 'C',
          explanation:
            '"Valley" = lembah, daerah rendah di antara gunung atau bukit.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "kawah"?',
          options: ['Cliff', 'Crater', 'Canyon', 'Cave'],
          answerKey: 'B',
          explanation: '"Crater" = kawah, misalnya kawah Gunung Bromo.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Bukit Lawang in North Sumatra has a hot, wet forest with tall trees and orangutans. This kind of forest is a…',
          options: ['desert', 'savanna', 'plateau', 'rainforest'],
          answerKey: 'D',
          explanation:
            '"Rainforest" = hutan hujan tropis: panas, lembap, dan lebat.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Uluwatu Temple stands on top of a high ___ above the ocean. (tebing)',
          answerKey: 'cliff',
          explanation:
            '"Cliff" = tebing. Pura Uluwatu berdiri di atas tebing tinggi.',
        },
        {
          type: 'ISIAN',
          prompt: 'Mount Bromo is an active ___. (gunung berapi)',
          answerKey: 'volcano',
          explanation:
            '"Volcano" = gunung berapi. "Active volcano" = gunung berapi aktif.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is an "oasis"?',
          options: [
            'A dry, sandy area with no water',
            'A place with water and plants in the middle of a desert',
            'A deep and narrow valley',
            'A small, low mountain',
          ],
          answerKey: 'B',
          explanation: '"Oasis" = mata air (dengan tanaman) di tengah gurun.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'The Dieng area in Central Java is a large, flat area high above sea level. It is a…',
          options: ['plateau', 'bay', 'canyon', 'cave'],
          answerKey: 'A',
          explanation:
            '"Plateau" = dataran tinggi: area datar yang letaknya tinggi, seperti Dieng.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'We will visit a cave this afternoon',
          explanation:
            '"We will visit a cave this afternoon." = Kita akan mengunjungi gua siang ini.',
        },
      ],
    },
    {
      code: 'EFT-502',
      title: 'Kosakata: Perairan & Laut',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Indonesia adalah negara kepulauan, jadi banyak objek wisatanya berhubungan dengan air: danau, pantai, air terjun, sampai terumbu karang.

:::phrases
- lake | danau | Danau Toba
- river | sungai
- waterfall | air terjun
- beach | pantai
- coast / shore | pesisir / pantai
- bay / gulf | teluk | Teluk Jimbaran
- island | pulau
- archipelago | kepulauan | Raja Ampat
- spring / hot spring | mata air / pemandian air panas
- coral reef | terumbu karang
- sea | laut
- ocean | samudra, laut lepas
:::

:::tip
**Beach** = tempat berpasir untuk bersantai, sedangkan **coast** atau **shore** = garis pantai secara umum. **Ocean** jauh lebih luas daripada **sea** — pantai selatan Bali menghadap Samudra Hindia (*the Indian Ocean*).
:::

## Dalam tur

:::dialog
Mr. Becker (Tamu): Is that an island in the middle of the lake?
Kamu (Tour Leader): Yes, that is Samosir Island, in the middle of Lake Toba.
Mr. Becker (Tamu): It looks beautiful. Can we go there?
Kamu (Tour Leader): Of course. We will take a boat across the lake tomorrow.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "waterfall" mean?',
          options: ['Sungai', 'Danau', 'Teluk', 'Air terjun'],
          answerKey: 'D',
          explanation: '"Waterfall" = air terjun.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'A large group of islands, like Raja Ampat, is called…',
          options: ['a bay', 'an archipelago', 'a coast', 'a spring'],
          answerKey: 'B',
          explanation: '"Archipelago" = kepulauan, gugusan banyak pulau.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Divers come to Raja Ampat to see the colourful coral ___. (terumbu karang)',
          answerKey: 'reef',
          acceptedAnswers: ['reefs'],
          explanation: '"Coral reef" = terumbu karang.',
        },
        {
          type: 'ISIAN',
          prompt:
            'After the trek, you can relax in a hot ___. (pemandian air panas)',
          answerKey: 'spring',
          acceptedAnswers: ['springs'],
          explanation: '"Hot spring" = pemandian air panas alami.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "teluk"?',
          options: ['Bay', 'Shore', 'River', 'Lake'],
          answerKey: 'A',
          explanation: '"Bay" atau "gulf" = teluk, misalnya Teluk Jimbaran.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'In Jimbaran, guests eat seafood on the sand by the sea and watch the sunset. Where are they?',
          options: [
            'In a cave',
            'At a waterfall',
            'On a beach',
            'On a plateau',
          ],
          answerKey: 'C',
          explanation: 'Pasir di tepi laut = "beach" (pantai).',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "samudra, laut lepas"?',
          options: ['Ocean', 'Lake', 'River', 'Spring'],
          answerKey: 'A',
          explanation: '"Ocean" = samudra, misalnya the Indian Ocean.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Samosir Island is in the middle of Lake Toba',
          explanation:
            '"Samosir Island is in the middle of Lake Toba." = Pulau Samosir berada di tengah Danau Toba.',
        },
      ],
    },
    {
      code: 'EFT-503',
      title: 'Kosakata: Objek Wisata Budaya',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 4,
      body: `Selain alam, banyak tamu datang untuk budaya: candi, pura, istana, desa adat, dan pasar tradisional.

:::phrases
- temple | pura / candi / kuil | Borobudur, Prambanan, Tanah Lot
- shrine | tempat suci / petilasan
- palace | istana | Keraton Yogyakarta
- museum | museum
- art gallery | galeri seni
- traditional village | desa tradisional / desa adat | Desa Penglipuran, Bali
- local market / bazaar | pasar lokal / pasar tradisional | Pasar Seni Ubud
- souvenir shop | toko suvenir / toko oleh-oleh
- viewpoint / lookout | gardu pandang / tempat melihat pemandangan indah | Penanjakan, Bromo
:::

:::tip
Dalam bahasa Inggris, **candi** dan **pura** sama-sama disebut **temple**. Sebut namanya supaya jelas: *Prambanan Temple*, *Tanah Lot Temple*.
:::

## Dalam tur

:::dialog
Kamu (Tour Leader): Up next is Ubud Art Market, a great place to buy local handicrafts.
Mrs. Dubois (Tamu): Wonderful! Is there also a souvenir shop near our hotel?
Kamu (Tour Leader): Yes, there are several souvenir shops along the main street.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "palace" mean?',
          options: ['Pasar', 'Istana', 'Galeri seni', 'Gua'],
          answerKey: 'B',
          explanation: '"Palace" = istana, misalnya Keraton Yogyakarta.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'In English, both "candi" and "pura" are called…',
          options: ['museum', 'palace', 'temple', 'gallery'],
          answerKey: 'C',
          explanation: 'Candi dan pura sama-sama disebut "temple".',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'In Penglipuran, Bali, people still keep their old customs and traditional houses. It is a…',
          options: [
            'traditional village',
            'souvenir shop',
            'viewpoint',
            'art gallery',
          ],
          answerKey: 'A',
          explanation: '"Traditional village" = desa tradisional / desa adat.',
        },
        {
          type: 'ISIAN',
          prompt:
            'You can buy small gifts for your family at the ___ shop. (oleh-oleh)',
          answerKey: 'souvenir',
          explanation: '"Souvenir shop" = toko suvenir / toko oleh-oleh.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where do you go to see paintings by local artists?',
          options: ['A cave', 'A bay', 'A viewpoint', 'An art gallery'],
          answerKey: 'D',
          explanation:
            '"Art gallery" = galeri seni, tempat memamerkan karya seni.',
        },
        {
          type: 'ISIAN',
          prompt:
            'From this ___, you can see the whole valley. (gardu pandang)',
          answerKey: 'viewpoint',
          acceptedAnswers: ['lookout', 'lookout point'],
          explanation:
            '"Viewpoint" / "lookout" = gardu pandang, tempat melihat pemandangan indah.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "pasar lokal / pasar tradisional"?',
          options: ['Shrine', 'Bazaar', 'Palace', 'Museum'],
          answerKey: 'B',
          explanation:
            '"Local market" / "bazaar" = pasar lokal, pasar tradisional.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Up next is the local market',
          explanation:
            '"Up next is the local market." = Selanjutnya adalah pasar lokal.',
        },
      ],
    },
    {
      code: 'EFT-504',
      title: 'Kata Sifat untuk Menggambarkan',
      skill: 'VOCABULARY',
      cefr: 'B1',
      estMinutes: 5,
      body: `Kata sifat yang tepat membuat penjelasanmu hidup. Bandingkan *"This is a nice lake"* dengan *"This is a serene and breathtaking lake"*.

:::phrases
- scenic | indah, berpemandangan indah
- breathtaking | sangat memukau, luar biasa indah
- stunning | sangat memukau, menakjubkan
- panoramic | bersifat panorama | pemandangan luas 360 derajat
- lush | subur, lebat | biasanya untuk tanaman atau hutan
- serene / peaceful | tenang / damai
- majestic | megah, agung
- pristine | masih murni, asri, belum tercemar
- remote | terpencil, jauh dari perkotaan
- vibrant | semarak, penuh warna, hidup
- historic / ancient | bersejarah / kuno
- must-see / must-visit | wajib dikunjungi
- iconic | ikonik, sangat terkenal
:::

## Pasangan yang pas

| Kata sifat | Cocok untuk | Contoh |
|---|---|---|
| lush | sawah, hutan | the lush rice terraces of Tegallalang |
| pristine | pantai, laut, terumbu karang | the pristine beaches of Raja Ampat |
| majestic | gunung, candi besar | the majestic Borobudur Temple |
| vibrant | pasar, festival, kota | the vibrant Ubud Art Market |
| serene | danau, desa, pagi hari | the serene Lake Toba |
| remote | pulau, desa | a remote island in Raja Ampat |

:::tip
**Must-see** bisa dipakai sebelum kata benda: *a must-see attraction*. **Historic** = penting dalam sejarah; **ancient** = sangat tua, berumur ratusan sampai ribuan tahun.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "pristine" mean?',
          options: [
            'Ramai',
            'Kuno',
            'Masih murni dan belum tercemar',
            'Terpencil',
          ],
          answerKey: 'C',
          explanation: '"Pristine" = masih murni, asri, belum tercemar.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which adjective best describes green rice terraces full of thick, healthy plants?',
          options: ['lush', 'remote', 'ancient', 'historic'],
          answerKey: 'A',
          explanation: '"Lush" = subur dan lebat, cocok untuk sawah dan hutan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'The market is full of colours, music and busy people. It is…',
          options: ['serene', 'pristine', 'remote', 'vibrant'],
          answerKey: 'D',
          explanation: '"Vibrant" = semarak, penuh warna, hidup.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Borobudur is one of the most ___ temples in Indonesia; it is famous all over the world. (ikonik)',
          answerKey: 'iconic',
          explanation: '"Iconic" = ikonik, sangat terkenal.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'The village is far from any city and hard to reach. It is…',
          options: ['majestic', 'remote', 'iconic', 'panoramic'],
          answerKey: 'B',
          explanation: '"Remote" = terpencil, jauh dari perkotaan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Early in the morning, the lake is calm and quiet. It feels very ___. (tenang)',
          answerKey: 'serene',
          acceptedAnswers: ['peaceful'],
          explanation: '"Serene" / "peaceful" = tenang, damai.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which sentence is correct?',
          options: [
            'This temple is a must-visit see.',
            'This is attraction a must-see.',
            'This temple is a must-see attraction.',
            'This must-see is temple.',
          ],
          answerKey: 'C',
          explanation:
            '"Must-see" dipakai sebelum kata benda: "a must-see attraction" = objek yang wajib dikunjungi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "majestic" mean?',
          options: [
            'Megah, agung',
            'Kecil, sederhana',
            'Kotor, rusak',
            'Baru, modern',
          ],
          answerKey: 'A',
          explanation:
            '"Majestic" = megah, agung — cocok untuk gunung atau candi besar.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'The view from the top is breathtaking',
          explanation:
            '"The view from the top is breathtaking." = Pemandangan dari puncak sangat memukau.',
        },
      ],
    },
    {
      code: 'EFT-505',
      title: 'Kategori & Memperkenalkan Objek Wisata',
      skill: 'READING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Sebelum tiba di sebuah objek, perkenalkan dulu jenisnya. Tamu jadi tahu apa yang akan mereka lihat dan bisa bersiap.

| Kategori | Arti | Contoh di Indonesia |
|---|---|---|
| Historical Site | Situs bersejarah | Benteng Vredeburg, Yogyakarta |
| Cultural Heritage | Warisan budaya | Batik, Keraton Yogyakarta |
| Natural Landmark | Markah tanah alam (gunung, danau, air terjun, dll.) | Danau Toba, Gunung Bromo |
| Architectural Wonder | Keajaiban arsitektur | Candi Borobudur |
| Scenic Viewpoint | Gardu pandang / tempat pemandangan indah | Penanjakan, Bromo |
| Local Market / Bazaar | Pasar lokal / pasar tradisional | Pasar Seni Ubud |

## Frasa memperkenalkan

:::phrases
- On our right, we have one of the most iconic historical sites in the city. | Di sebelah kanan kita, ada salah satu situs bersejarah paling ikonik di kota ini.
- This area is famous for its breathtaking natural scenery. | Area ini terkenal dengan pemandangan alamnya yang sangat memukau.
- Up next on our itinerary is a picturesque cultural village. | Selanjutnya dalam jadwal perjalanan kita adalah desa wisata budaya yang sangat indah.
:::

:::tip
**Picturesque** = seindah lukisan, cocok untuk desa, sawah, atau kota kecil. Perhatikan pola *one of the most* + kata sifat + kata benda **jamak**: one of the most iconic **sites**, bukan *site*.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is Fort Vredeburg today?',
          options: ['A hotel', 'A market', 'A museum', 'A temple'],
          answerKey: 'C',
          passage: YOGYA_DAY,
          explanation: '"…and today it is a museum."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which place does Andi call "an architectural wonder"?',
          options: [
            'Borobudur',
            'Fort Vredeburg',
            'The cultural village',
            'The viewpoint',
          ],
          answerKey: 'A',
          passage: YOGYA_DAY,
          explanation:
            '"Up next on our itinerary is Borobudur, an architectural wonder…"',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What can the guests do in the cultural village?',
          options: [
            'Swim in a lake',
            'Watch local people make batik',
            'Climb a volcano',
            'Visit a museum',
          ],
          answerKey: 'B',
          passage: YOGYA_DAY,
          explanation: '"…where you can watch local people make batik."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where will the group finish the day?',
          options: [
            'At the fort',
            'At the hotel pool',
            'At the airport',
            'At a scenic viewpoint',
          ],
          answerKey: 'D',
          passage: YOGYA_DAY,
          explanation:
            '"We will finish the day at a scenic viewpoint to enjoy the sunset."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Lake Toba and Mount Bromo belong to which category?',
          options: [
            'Local Market',
            'Historical Site',
            'Architectural Wonder',
            'Natural Landmark',
          ],
          answerKey: 'D',
          explanation:
            'Gunung, danau, dan air terjun termasuk "Natural Landmark" (markah tanah alam).',
        },
        {
          type: 'ISIAN',
          prompt:
            'This area is ___ for its breathtaking natural scenery. (terkenal)',
          answerKey: 'famous',
          acceptedAnswers: ['known', 'well known', 'well-known'],
          explanation:
            '"Famous for" = terkenal dengan/karena. "Known for" juga benar.',
        },
        {
          type: 'ISIAN',
          prompt:
            'On our right, we have one of the most iconic historical ___ in the city.',
          answerKey: 'sites',
          acceptedAnswers: ['places', 'landmarks'],
          explanation:
            'Setelah "one of the most…", kata bendanya jamak: "historical sites".',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey:
            'Up next on our itinerary is a picturesque cultural village',
          explanation:
            '"Up next on our itinerary is a picturesque cultural village." = Selanjutnya dalam jadwal perjalanan kita adalah desa wisata budaya yang sangat indah.',
        },
      ],
    },
    {
      code: 'EFT-506',
      title: 'Memberi Informasi: Sejarah & Daya Tarik',
      skill: 'GRAMMAR',
      cefr: 'B1',
      estMinutes: 5,
      body: `Tamu senang mendengar sedikit sejarah dan alasan sebuah tempat terkenal — asal singkat, jelas, dan menarik. Sampaikan satu atau dua fakta, satu daya tarik utama, lalu alasan orang datang ke sana.

## Frasa kunci

:::phrases
- This landmark was built in the 18th century and served as a royal palace. | Markah tanah ini dibangun pada abad ke-18 dan berfungsi sebagai istana kerajaan.
- The main highlight of this place is its unique traditional architecture. | Daya tarik utama dari tempat ini adalah arsitektur tradisionalnya yang unik.
- It is widely known as the symbol of unity and peace in this region. | Tempat ini dikenal luas sebagai simbol persatuan dan perdamaian di wilayah ini.
- Visitors come here mainly to enjoy the sunset and local street food. | Pengunjung datang ke sini utamanya untuk menikmati matahari terbenam dan jajanan lokal.
:::

## Pola kalimat

| Pola | Contoh |
|---|---|
| was built in + waktu | Prambanan was built in the 9th century. |
| served as + fungsi | Fort Vredeburg served as a Dutch fort. |
| is known as + sebutan | Bali is known as the Island of the Gods. |
| is famous for + alasan | Tanah Lot is famous for its sunset views. |
| The main highlight is + kata benda | The main highlight is the view of the crater. |

:::tip
Pakai bentuk pasif **was built** (dibangun): *"Borobudur was built in the 9th century"*, bukan *"Borobudur built in the 9th century"*. Ingat juga: **known as** + nama atau sebutan, **famous for** + alasan terkenal.
:::

## Contoh penjelasan

:::dialog
Kamu (Tour Leader): This is Prambanan, a Hindu temple compound built in the 9th century.
Mr. Tanaka (Tamu): What is the main highlight here?
Kamu (Tour Leader): The main highlight is the tall central temple, which is dedicated to Shiva.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Choose the correct sentence.',
          options: [
            'Prambanan built in the 9th century.',
            'Prambanan was built in the 9th century.',
            'Prambanan is build in the 9th century.',
            'Prambanan was build in the 9th century.',
          ],
          answerKey: 'B',
          explanation:
            'Bentuk pasif lampau: was + built (V3). "Prambanan was built in the 9th century."',
        },
        {
          type: 'ISIAN',
          prompt:
            'This landmark was built in the 18th century and ___ as a royal palace. (berfungsi)',
          answerKey: 'served',
          explanation: '"Served as" = berfungsi sebagai.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Tanah Lot is famous ___ its sunset views.',
          options: ['of', 'with', 'at', 'for'],
          answerKey: 'D',
          explanation: '"Famous for" = terkenal karena/dengan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "the main highlight of this place" mean?',
          options: [
            'Daya tarik utama dari tempat ini',
            'Lampu utama di tempat ini',
            'Pintu masuk utama tempat ini',
            'Jadwal utama di tempat ini',
          ],
          answerKey: 'A',
          explanation: '"Main highlight" = daya tarik utama.',
        },
        {
          type: 'ISIAN',
          prompt:
            'It is widely ___ as the symbol of unity and peace in this region. (dikenal)',
          answerKey: 'known',
          explanation: '"Widely known as" = dikenal luas sebagai.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Visitors come here ___ to enjoy the sunset and local street food. (utamanya)',
          options: ['finally', 'lately', 'mainly', 'never'],
          answerKey: 'C',
          explanation: '"Mainly" = utamanya, terutama.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest asks, "Why do people come here?" Which answer gives the best information?',
          options: [
            'It was built.',
            'The bus is parked over there.',
            'Please meet back at three.',
            'Visitors come here mainly to enjoy the sunset and local street food.',
          ],
          answerKey: 'D',
          explanation:
            'Jawaban terbaik menyebut alasan orang datang: matahari terbenam dan jajanan lokal.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey:
            'The main highlight of this place is its unique traditional architecture',
          explanation:
            '"The main highlight of this place is its unique traditional architecture." = Daya tarik utama tempat ini adalah arsitektur tradisionalnya yang unik.',
        },
      ],
    },
    {
      code: 'EFT-507',
      title: 'Mengarahkan Tamu di Lokasi',
      skill: 'READING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Setibanya di lokasi, arahkan tamu: ke mana untuk foto terbaik, di mana fasilitasnya, dan aturan apa yang wajib dipatuhi. Arahan yang jelas mencegah tamu tersesat atau tanpa sengaja melanggar aturan.

## Spot foto & fasilitas

:::phrases
- If you want to take the best photos, head over to the upper balcony. | Jika Anda ingin mengambil foto terbaik, silakan menuju ke balkon atas.
- Feel free to walk around the gardens, but please stay on the designated paths. | Silakan berjalan-jalan di sekitar taman, tetapi harap tetap berada di jalur yang telah ditentukan.
- You can find souvenir shops along the main exit hallway. | Anda dapat menemukan toko-toko suvenir di sepanjang lorong keluar utama.
:::

## Aturan

:::phrases
- Please be aware that photography is not allowed inside the main chapel. | Harap diperhatikan bahwa fotografi tidak diperbolehkan di dalam kapel utama.
- Please wear a sarong before you enter the temple. | Harap kenakan kain sarung sebelum memasuki pura.
- Please do not climb or sit on the stupas. | Mohon jangan memanjat atau duduk di atas stupa.
:::

:::tip
**Head over to** = menuju ke. **Designated paths** = jalur yang telah ditentukan. **Feel free to** terdengar ramah untuk hal yang boleh; **please be aware that** dipakai untuk aturan penting.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What must the guests wear before they enter?',
          options: [
            'A sarong and a sash',
            'A hat and sunglasses',
            'Sport shoes',
            'A life jacket',
          ],
          answerKey: 'A',
          passage: ULUWATU,
          explanation:
            '"…please put on the sarong and sash that I will give you."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why must the guests stay on the designated paths?',
          options: [
            'Because the paths are new',
            'Because the monkeys live there',
            'Because the cliff is very high',
            'Because the shops are closed',
          ],
          answerKey: 'C',
          passage: ULUWATU,
          explanation:
            '"…please stay on the designated paths, because the cliff is very high."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Who can enter the inner area of the temple?',
          options: [
            'Everyone with a ticket',
            'Only tour leaders',
            'Guests with a camera',
            'Only people who come to pray',
          ],
          answerKey: 'D',
          passage: ULUWATU,
          explanation:
            '"…the inner area of the temple is only for people who come to pray."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why should the guests hold on to their sunglasses and hats?',
          options: [
            'The monkeys sometimes grab them',
            'It is very windy',
            'Photography is not allowed',
            'The sun is too hot',
          ],
          answerKey: 'A',
          passage: ULUWATU,
          explanation: '"…because the monkeys here sometimes grab them."',
        },
        {
          type: 'ISIAN',
          prompt:
            'If you want to take the best photos, ___ over to the upper balcony. (menuju)',
          answerKey: 'head',
          explanation: '"Head over to" = menuju ke.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'What does "Please be aware that photography is not allowed inside the main chapel" mean?',
          options: [
            'Silakan berfoto sepuasnya di dalam kapel utama',
            'Fotografer menunggu Anda di dalam kapel utama',
            'Harap diperhatikan bahwa fotografi tidak diperbolehkan di dalam kapel utama',
            'Kamera bisa dibeli di dalam kapel utama',
          ],
          answerKey: 'C',
          explanation:
            '"Please be aware that…" = harap diperhatikan bahwa…; "not allowed" = tidak diperbolehkan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'You can find souvenir ___ along the main exit hallway. (toko)',
          answerKey: 'shops',
          acceptedAnswers: ['stores'],
          explanation: '"Souvenir shops" = toko-toko suvenir.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Please stay on the designated paths',
          explanation:
            '"Please stay on the designated paths." = Harap tetap berada di jalur yang telah ditentukan.',
        },
      ],
    },
    {
      code: 'EFT-508',
      title: 'Menyampaikan Info Praktis dengan Tepat',
      skill: 'GRAMMAR',
      cefr: 'B1',
      estMinutes: 5,
      body: `Informasi praktis harus **tepat**: berapa lama waktu bebas, jam dan tempat kumpul, tiket, serta keselamatan. Satu angka yang salah bisa membuat tamu tertinggal bus.

:::phrases
- We will have 45 minutes of free time here for exploration and photos. | Kita akan memiliki waktu bebas selama 45 menit di sini untuk eksplorasi dan berfoto.
- Please meet back at the bus by 3:30 PM sharp so we stay on schedule. | Harap berkumpul kembali di bus tepat pukul 15.30 agar kita tetap sesuai jadwal.
- Please keep your entrance ticket with you at all times, as you may need to show it at the inner gate. | Harap simpan tiket masuk Anda setiap saat, karena Anda mungkin perlu menunjukkannya di pintu dalam.
- For your safety, please hold onto the handrails when walking down the steep steps. | Demi keselamatan Anda, harap berpegangan pada pegangan tangga saat menuruni anak tangga yang curam.
:::

## Kata kecil yang menentukan

| Kata | Arti | Contoh |
|---|---|---|
| for | selama (durasi) | We will stay here **for** one hour. |
| by | paling lambat | Please be back **by** 3:30 PM. |
| at | tepat pada (jam) | The bus leaves **at** 4 PM. |
| until | sampai | You are free **until** 11 AM. |
| sharp | tepat, tidak boleh telat | 3:30 PM **sharp** |

:::tip
Ulangi jam kumpul dua kali dan sebutkan tempatnya: *"Our meeting time is 3:30 PM, at the bus. Again, 3:30 PM, at the bus."* Hati-hati dengan angka yang mirip: thir**TEEN** (13) vs **THIR**ty (30).
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Please meet back at the bus ___ 3:30 PM sharp.',
          options: ['for', 'by', 'during', 'since'],
          answerKey: 'B',
          explanation: '"By 3:30 PM" = paling lambat pukul 15.30.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "3:30 PM sharp" mean?',
          options: [
            'Sekitar pukul 15.30',
            'Setelah pukul 15.30',
            'Tepat pukul 15.30',
            'Sebelum pukul 13.30',
          ],
          answerKey: 'C',
          explanation: '"Sharp" setelah jam = tepat, tidak boleh terlambat.',
        },
        {
          type: 'ISIAN',
          prompt:
            'We will have 45 minutes of free ___ here for exploration and photos.',
          answerKey: 'time',
          explanation: '"Free time" = waktu bebas.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why should guests keep their entrance ticket with them?',
          options: [
            'They may need to show it at the inner gate',
            'They can sell it later',
            'It is a free souvenir',
            'The bus driver needs it',
          ],
          answerKey: 'A',
          explanation:
            '"…as you may need to show it at the inner gate" = karena mungkin perlu ditunjukkan di pintu dalam.',
        },
        {
          type: 'ISIAN',
          prompt:
            'For your safety, please hold onto the ___ when walking down the steep steps. (pegangan tangga)',
          answerKey: 'handrails',
          acceptedAnswers: ['handrail', 'railing', 'railings'],
          explanation: '"Handrails" = pegangan tangga.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'You are free ___ 11 AM. Then we will have lunch together.',
          options: ['at', 'for', 'during', 'until'],
          answerKey: 'D',
          explanation: '"Until 11 AM" = sampai pukul 11.00.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which announcement gives the clearest information?',
          options: [
            'Come back later, okay?',
            'Please meet back at the bus by 3:30 PM sharp.',
            'Be back soon.',
            'We will meet sometime this afternoon.',
          ],
          answerKey: 'B',
          explanation:
            'Info praktis yang tepat menyebut jam DAN tempat kumpul: "at the bus by 3:30 PM sharp".',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Please keep your entrance ticket with you at all times',
          explanation:
            '"Please keep your entrance ticket with you at all times." = Harap simpan tiket masuk Anda setiap saat.',
        },
      ],
    },
    {
      code: 'EFT-509',
      title: 'Menyimak: Penjelasan di Objek Wisata',
      skill: 'LISTENING',
      cefr: 'B1',
      estMinutes: 6,
      body: `Penjelasan tour leader di lokasi biasanya berurutan:

1. Perkenalan objek
2. Sejarah singkat dan daya tarik utama
3. Arahan: spot foto dan aturan
4. Info praktis: waktu bebas, jam kumpul, tiket, keselamatan

:::phrases
- Welcome to Borobudur, the largest Buddhist temple in the world. | Selamat datang di Borobudur, candi Buddha terbesar di dunia. | perkenalan
- It was built in the 9th century, and today it is a UNESCO World Heritage Site. | Candi ini dibangun pada abad ke-9 dan kini menjadi Situs Warisan Dunia UNESCO. | sejarah
- Please do not climb or sit on the stupas. | Mohon jangan memanjat atau duduk di atas stupa. | aturan
- We will have one hour of free time here. | Kita punya waktu bebas satu jam di sini. | info praktis
:::

:::tip
Saat menyimak, fokus pada **angka, jam, dan tempat** — informasi inilah yang paling sering ditanyakan ulang oleh tamu.
:::

Di kuis, dengarkan penjelasan tour leader lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'When was the temple built?',
          options: [
            'In the 7th century',
            'In the 9th century',
            'In the 18th century',
            'In the last century',
          ],
          answerKey: 'B',
          tts: 'Welcome to Borobudur, the largest Buddhist temple in the world. It was built in the 9th century, and today it is a UNESCO World Heritage Site.',
          explanation:
            '"It was built in the 9th century" = dibangun pada abad ke-9.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'According to the tour leader, what is the main highlight?',
          options: [
            'The souvenir shops',
            'The sunset',
            'The stone carvings',
            'The gardens',
          ],
          answerKey: 'C',
          tts: 'The main highlight of Borobudur is its stone carvings. The walls tell stories from the life of the Buddha, so please take your time to look at them.',
          explanation:
            '"The main highlight of Borobudur is its stone carvings" = relief batu.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What are the guests NOT allowed to do?',
          options: [
            'Climb or sit on the stupas',
            'Walk around the temple',
            'Take photos of the view',
            'Stay on the paths',
          ],
          answerKey: 'A',
          tts: 'Please be aware that you cannot climb or sit on the stupas. Feel free to walk around, but please stay on the designated paths.',
          explanation:
            '"…you cannot climb or sit on the stupas" = tidak boleh memanjat atau duduk di atas stupa.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where does Rina suggest taking the best photos?',
          options: [
            'At the bus',
            'In the museum',
            'At the main gate',
            'In the garden near the exit',
          ],
          answerKey: 'D',
          tts: 'Guest: Excuse me, where can I take the best photos?\nRina: Head over to the garden near the exit. From there, you can see the whole temple and the mountains behind it.',
          explanation:
            '"Head over to the garden near the exit" = menuju taman dekat pintu keluar.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What time should the group meet back at the bus?',
          options: ['10:30 AM', '11:00 AM', '11:30 AM', '1:30 PM'],
          answerKey: 'C',
          tts: 'We will have one hour of free time here for exploration and photos. Please meet back at the bus by 11:30 AM sharp, so we stay on schedule.',
          explanation: '"…by 11:30 AM sharp" = tepat pukul 11.30.',
        },
        {
          type: 'ISIAN',
          prompt: 'You may need to show your ticket at the inner ___.',
          answerKey: 'gate',
          tts: 'Please keep your entrance ticket with you at all times, because you may need to show it at the inner gate.',
          explanation: '"Inner gate" = pintu dalam.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Why should the guests hold onto the handrails?',
          options: [
            'It is a good photo spot',
            'The steps are steep and can be slippery',
            'The handrails are new',
            'The tour leader wants to rest',
          ],
          answerKey: 'B',
          tts: 'For your safety, please hold onto the handrails when you walk down the steep steps. The stones can be slippery after the rain.',
          explanation:
            'Anak tangga curam ("steep") dan batu bisa licin ("slippery") setelah hujan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How much free time do the guests have at Tegallalang?',
          options: [
            'Fifteen minutes',
            'Thirty minutes',
            'One hour',
            'Forty-five minutes',
          ],
          answerKey: 'D',
          tts: "Mrs. Allen: These rice terraces are stunning! How long do we have here?\nDewi: We have forty-five minutes of free time. Please meet back at the bus at two o'clock.",
          explanation:
            '"We have forty-five minutes of free time" = waktu bebas 45 menit.',
        },
      ],
    },
    {
      code: 'EFT-510',
      title: 'Ucapkan: Menjelaskan Objek Wisata',
      skill: 'SPEAKING',
      cefr: 'B1',
      estMinutes: 5,
      body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- On our right, we have one of the most iconic historical sites in the city. | Di sebelah kanan kita, ada salah satu situs bersejarah paling ikonik di kota ini.
- This area is famous for its breathtaking natural scenery. | Area ini terkenal dengan pemandangan alamnya yang sangat memukau.
- The main highlight of this place is its unique traditional architecture. | Daya tarik utama dari tempat ini adalah arsitektur tradisionalnya yang unik.
- If you want to take the best photos, head over to the upper balcony. | Jika Anda ingin mengambil foto terbaik, silakan menuju ke balkon atas.
- Feel free to walk around, but please stay on the designated paths. | Silakan berjalan-jalan, tetapi harap tetap berada di jalur yang telah ditentukan.
- Please keep your entrance ticket with you at all times. | Harap simpan tiket masuk Anda setiap saat.
:::

:::tip
Tekankan kata sifat dan informasi penting — *iconic*, *breathtaking*, *designated paths* — dan beri jeda di koma supaya tamu mudah menangkapnya.
:::`,
      items: [
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'On our right, we have one of the most iconic historical sites in the city',
          explanation: 'Memperkenalkan objek wisata dari dalam bus.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'This area is famous for its breathtaking natural scenery',
          explanation: 'Menggambarkan daya tarik alam sebuah daerah.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'The main highlight of this place is its unique traditional architecture',
          explanation: 'Menyebut daya tarik utama sebuah tempat.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'If you want to take the best photos, head over to the upper balcony',
          explanation: 'Mengarahkan tamu ke spot foto terbaik.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            'Feel free to walk around, but please stay on the designated paths',
          explanation: 'Memberi kebebasan sambil mengingatkan aturan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Please keep your entrance ticket with you at all times',
          explanation: 'Menyampaikan info praktis soal tiket.',
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
