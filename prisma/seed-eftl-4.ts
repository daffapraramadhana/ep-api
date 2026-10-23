// apps/api/prisma/seed-eftl-4.ts
import { KitModule, seedModule } from './seed-module-kit';

/**
 * Seed KONTEN — EFTL Modul 4 "Giving Directions" (DASAR·A2), dari PDF klien
 * "Modul 4 EFTL Samitago" (English for Tour Leaders — Memberikan Petunjuk
 * Lokasi). Konteks tetap Tour Leader. 7 bab, kuis EFT-401..407; langsung LIVE.
 *
 * Alur: memahami pertanyaan lokasi tamu → ungkapan memberi arah → kata depan
 * tempat → kata kerja arah & titik acuan → petunjuk langkah demi langkah
 * (bacaan denah mal) → menyimak petunjuk di bandara (TTS) → ucapan.
 *
 * Jalankan: `npm run seed:eftl-4`. CREATE-ONLY (lihat seed-module-kit.ts).
 */

const SUSUN = 'Susun kalimat berikut:';
const UCAP = 'Baca kalimat ini dengan lantang.';

const MALL = `You are at the main entrance of Galaxy Mall with your tour group. The information desk is right in front of you, and the escalator is behind the information desk.

To find the currency exchange, go straight ahead and walk past the cafe on your left-hand side. At the corner, turn right. The pharmacy is the first shop on the corner, and the currency exchange is right next to it. The restrooms are opposite the currency exchange.

The food court is not on this floor. To get there, take the escalator up to the second floor.`;

export const def: KitModule = {
  slug: 'eftl-4-giving-directions',
  title: 'Giving Directions',
  summary:
    'Memahami pertanyaan lokasi dari tamu dan memberi petunjuk arah yang jelas, langkah demi langkah.',
  topic: 'Giving Directions',
  level: 'DASAR',
  cefr: 'A2',
  status: 'LIVE',
  chapters: [
    {
      code: 'EFT-401',
      title: 'Memahami Pertanyaan Lokasi',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 4,
      body: `Di bandara, mal, atau kompleks candi, tamu akan sering bertanya arah. Bentuk pertanyaannya bisa berbeda-beda, jadi dengarkan baik-baik **tempat** yang mereka cari.

## Pertanyaan yang sering muncul

:::phrases
- Excuse me, where is the nearest restroom? | Permisi, di mana toilet terdekat?
- Could you tell me how to get to the souvenir shop? | Bisakah Anda beri tahu saya cara menuju ke toko suvenir?
- Is the main entrance far from here? | Apakah pintu masuk utama jauh dari sini?
- Where is our designated meeting point? | Di mana titik kumpul yang telah ditentukan untuk kita?
- Which way should I go to find the bus parking area? | Ke arah mana saya harus berjalan untuk menemukan area parkir bus?
- What is our next destination? | Apa tujuan kita selanjutnya?
- What place are we going to visit next? | Tempat apa yang akan kita kunjungi setelah ini?
:::

:::tip
Pertanyaan sopan seperti **Could you tell me how to get to…?** intinya sama dengan **Where is…?** Fokus pada kata tempatnya: *restroom*, *souvenir shop*, *meeting point*, *bus parking area*.
:::

## Dalam tur

:::dialog
Mrs. Tan (Tamu): Excuse me, where is the nearest restroom?
Kamu (Tour Leader): It's next to the souvenir shop, on your left-hand side.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest asks, "Excuse me, where is the nearest restroom?" What is the guest looking for?',
          options: [
            'A souvenir shop',
            'A restaurant',
            'The nearest restroom',
            'The bus parking area',
          ],
          answerKey: 'C',
          explanation:
            '"Restroom" = toilet. Tamu mencari toilet terdekat (nearest).',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "Is the main entrance far from here?" mean?',
          options: [
            'Di mana pintu keluar?',
            'Apakah pintu masuk utama sudah dibuka?',
            'Berapa harga tiket masuk?',
            'Apakah pintu masuk utama jauh dari sini?',
          ],
          answerKey: 'D',
          explanation:
            '"Main entrance" = pintu masuk utama; "far from here" = jauh dari sini.',
        },
        {
          type: 'ISIAN',
          prompt: 'Could you tell me how to ___ to the souvenir shop?',
          answerKey: 'get',
          explanation:
            '"How to get to…" = cara menuju ke…. Ini cara sopan menanyakan arah.',
        },
        {
          type: 'ISIAN',
          prompt: 'Where is our designated meeting ___?',
          answerKey: 'point',
          explanation: '"Meeting point" = titik kumpul.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "meeting point" mean?',
          options: [
            'Titik kumpul',
            'Ruang rapat',
            'Jadwal pertemuan',
            'Tempat parkir',
          ],
          answerKey: 'A',
          explanation:
            '"Meeting point" = titik kumpul, tempat rombongan berkumpul lagi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which question asks about the NEXT place on the tour itinerary?',
          options: [
            'Where is the nearest restroom?',
            'Is the main entrance far from here?',
            'What place are we going to visit next?',
            'Which way should I go to find the bus parking area?',
          ],
          answerKey: 'C',
          explanation:
            '"What place are we going to visit next?" = tempat apa yang akan kita kunjungi setelah ini.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest asks, "Which way should I go to find the bus parking area?" The guest wants…',
          options: [
            'to buy a bus ticket',
            'directions to the place where the bus is parked',
            'to know the next destination',
            'to pay for parking',
          ],
          answerKey: 'B',
          explanation:
            '"Which way should I go…?" = ke arah mana saya harus berjalan. Tamu menanyakan arah ke area parkir bus.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Is the main entrance far from here',
          explanation:
            '"Is the main entrance far from here?" = Apakah pintu masuk utama jauh dari sini?',
        },
      ],
    },
    {
      code: 'EFT-402',
      title: 'Ungkapan Memberi Arah',
      skill: 'VOCABULARY',
      cefr: 'A2',
      estMinutes: 5,
      body: `Saat memberi arah, pakai kalimat perintah yang singkat dan jelas: **kata kerja + arah + tempat**. Tamu lebih mudah mengikuti satu langkah per kalimat.

## Frasa kunci

:::phrases
- Go straight ahead until you reach the main lobby. | Jalan lurus terus sampai Anda tiba di lobi utama.
- Turn left / Turn right at the next intersection. | Belok kiri / Belok kanan di persimpangan berikutnya.
- Walk past the ticketing booth, and you will see it. | Jalan melewati loket tiket, dan Anda akan melihatnya.
- Head towards the food court on the second floor. | Jalan menuju ke arah food court (pujasera) di lantai dua.
- Take the escalator down to the basement level. | Gunakan eskalator turun ke lantai bawah tanah (basement).
:::

:::tip
**Take the escalator up** = naik; **take the escalator down** = turun. Sebutkan juga lantainya: *up to the second floor*, *down to the basement level*.
:::

## Dalam tur

:::dialog
Mr. Brown (Tamu): Could you tell me how to get to the food court?
Kamu (Tour Leader): Sure. Take the escalator up to the second floor, then head towards the big clock. The food court is right there.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "Go straight ahead" mean?',
          options: [
            'Belok kiri',
            'Putar balik',
            'Jalan lurus terus',
            'Naik tangga',
          ],
          answerKey: 'C',
          explanation: '"Go straight ahead" = jalan lurus terus.',
        },
        {
          type: 'ISIAN',
          prompt: 'Turn ___ at the next intersection. (kiri)',
          answerKey: 'left',
          explanation: '"Turn left" = belok kiri. "Turn right" = belok kanan.',
        },
        {
          type: 'ISIAN',
          prompt: 'Walk ___ the ticketing booth, and you will see it.',
          answerKey: 'past',
          explanation:
            '"Walk past" = jalan melewati. "Walk past the ticketing booth" = jalan melewati loket tiket.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            '"Take the escalator down to the basement level." Where should the guest go?',
          options: [
            'To the top floor',
            'To the basement',
            'To the second floor',
            'Outside the building',
          ],
          answerKey: 'B',
          explanation:
            '"Down to the basement level" = turun ke lantai bawah tanah.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'Which sentence means "Jalan menuju ke arah food court di lantai dua"?',
          options: [
            'Head towards the food court on the second floor.',
            'Walk past the food court on the second floor.',
            'Take the escalator down to the food court.',
            'The food court is behind the second floor.',
          ],
          answerKey: 'A',
          explanation:
            '"Head towards…" = jalan menuju ke arah…. "Walk past" justru berarti melewati.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Go straight ahead until you reach the main lobby',
          explanation:
            '"Go straight ahead until you reach the main lobby." = Jalan lurus terus sampai Anda tiba di lobi utama.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Head ___ the food court on the second floor. (menuju ke arah)',
          answerKey: 'towards',
          acceptedAnswers: ['toward'],
          explanation: '"Head towards" / "head toward" = jalan menuju ke arah.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest is on the ground floor and wants to go to the basement. What do you say?',
          options: [
            'Take the escalator up to the second floor.',
            'Go straight ahead until you reach the main lobby.',
            'Turn right at the next intersection.',
            'Take the escalator down to the basement level.',
          ],
          answerKey: 'D',
          explanation:
            'Basement ada di bawah lantai dasar → "Take the escalator down to the basement level."',
        },
      ],
    },
    {
      code: 'EFT-403',
      title: 'Kata Depan Penunjuk Tempat',
      skill: 'GRAMMAR',
      cefr: 'A1',
      estMinutes: 5,
      body: `Kata depan tempat (*prepositions of place*) menjelaskan posisi sebuah tempat dibandingkan tempat lain. Pola dasarnya: **The [tempat] is + kata depan + [tempat acuan].**

## Kata depan tempat

:::phrases
- next to / beside | di sebelah | The restroom is next to the cafe.
- in front of | di depan | Our bus is waiting in front of the hotel.
- behind | di belakang | The parking area is behind the temple.
- opposite / across from | berseberangan / di seberang | The pharmacy is opposite the bank.
- on your right-hand side / left-hand side | di sisi sebelah kanan / kiri Anda | The exit is on your left-hand side.
- on the corner of | di sudut / pojokan | The souvenir shop is on the corner of the street.
:::

:::tip
**Opposite** langsung diikuti tempatnya: *opposite the bank* (bukan *opposite of the bank*). **In front of** = di depan, di sisi yang sama; **opposite** = di seberang, misalnya beda sisi jalan atau lorong.
:::

## Dalam tur

:::dialog
Ms. Garcia (Tamu): Where is the ticket office?
Kamu (Tour Leader): It's behind the main gate, next to the souvenir shop.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which phrase means "di belakang"?',
          options: ['In front of', 'Next to', 'Opposite', 'Behind'],
          answerKey: 'D',
          explanation: '"Behind" = di belakang. "In front of" = di depan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            '"The bus is parked opposite the information desk." Where is the bus?',
          options: [
            'Di belakang meja informasi',
            'Di seberang meja informasi',
            'Di sebelah meja informasi',
            'Di dalam gedung',
          ],
          answerKey: 'B',
          explanation: '"Opposite" = berseberangan / di seberang.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "on the corner of" mean?',
          options: [
            'Di sudut / pojokan',
            'Di tengah',
            'Di belakang',
            'Di seberang',
          ],
          answerKey: 'A',
          explanation:
            '"On the corner of" = di sudut / pojokan. Contoh: on the corner of the street.',
        },
        {
          type: 'ISIAN',
          prompt: 'The restroom is ___ the cafe. (di sebelah)',
          answerKey: 'next to',
          acceptedAnswers: ['beside'],
          explanation: '"Next to" / "beside" = di sebelah.',
        },
        {
          type: 'ISIAN',
          prompt: 'The pharmacy is ___ the bank. (di seberang)',
          answerKey: 'opposite',
          acceptedAnswers: ['across from'],
          explanation: '"Opposite" / "across from" = di seberang.',
        },
        {
          type: 'ISIAN',
          prompt: 'Our bus is waiting in ___ of the hotel. (di depan)',
          answerKey: 'front',
          explanation: '"In front of" = di depan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'You are walking along the hallway, and the exit is on your right. What do you tell the guests?',
          options: [
            'The exit is on your left-hand side.',
            'The exit is behind you.',
            'The exit is on your right-hand side.',
            'The exit is on the second floor.',
          ],
          answerKey: 'C',
          explanation:
            '"On your right-hand side" = di sisi sebelah kanan Anda.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which phrase has the same meaning as "next to"?',
          options: ['Behind', 'Opposite', 'In front of', 'Beside'],
          answerKey: 'D',
          explanation: '"Beside" = "next to" = di sebelah.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Our bus is waiting in front of the hotel',
          explanation:
            '"Our bus is waiting in front of the hotel." = Bus kita menunggu di depan hotel.',
        },
      ],
    },
    {
      code: 'EFT-404',
      title: 'Kata Kerja Arah & Titik Acuan',
      skill: 'VOCABULARY',
      cefr: 'A1',
      estMinutes: 5,
      body: `Petunjuk yang baik memakai **kata kerja arah** dan **titik acuan** (*landmark*) yang mudah dilihat tamu.

## Kata kerja arah

:::phrases
- turn | belok | Turn right at the junction.
- cross | menyeberang | Cross the street at the traffic light.
- pass / walk past | melewati | Walk past the ticketing booth.
:::

## Titik acuan

:::phrases
- intersection / junction | persimpangan / perempatan
- entrance / exit | pintu masuk / pintu keluar
- lobby / waiting area | lobi / area tunggu
- elevator | lift
- escalator | eskalator
- stairs | tangga
- landmark / point of interest | bangunan acuan / titik penanda
:::

:::tip
**Elevator** (Amerika) dan **lift** (Inggris) sama artinya. Pilih titik acuan yang besar dan jelas, seperti air mancur, kafe, atau loket tiket, supaya tamu tidak tersesat.
:::`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What does "cross" mean?',
          options: ['Belok', 'Melewati', 'Menyeberang', 'Berhenti'],
          answerKey: 'C',
          explanation:
            '"Cross" = menyeberang. "Cross the street" = menyeberang jalan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which word means "pintu keluar"?',
          options: ['Entrance', 'Exit', 'Lobby', 'Stairs'],
          answerKey: 'B',
          explanation: '"Exit" = pintu keluar. "Entrance" = pintu masuk.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Please ___ the street carefully at the traffic light. (menyeberang)',
          answerKey: 'cross',
          explanation: '"Cross the street" = menyeberang jalan.',
        },
        {
          type: 'ISIAN',
          prompt: 'Turn right at the next ___. (persimpangan)',
          answerKey: 'intersection',
          acceptedAnswers: ['junction'],
          explanation:
            '"Intersection" / "junction" = persimpangan / perempatan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt:
            'A guest in a wheelchair needs to go up to the third floor. What do you suggest?',
          options: [
            'Take the elevator.',
            'Take the stairs.',
            'Take the escalator.',
            'Walk past the exit.',
          ],
          answerKey: 'A',
          explanation:
            'Kursi roda tidak bisa naik tangga atau eskalator → "Take the elevator."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is a "landmark"?',
          options: [
            'A ticket for the bus',
            'A map of the city',
            'A parking area',
            'An easy-to-see building or place used as a reference',
          ],
          answerKey: 'D',
          explanation:
            '"Landmark" = bangunan acuan / titik penanda yang mudah dikenali.',
        },
        {
          type: 'ISIAN',
          prompt:
            'Please wait for me in the ___ area near the gate. (area tunggu)',
          answerKey: 'waiting',
          explanation: '"Waiting area" = area tunggu.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: 'Walk past the ticketing booth and turn left',
          explanation:
            '"Walk past the ticketing booth and turn left." = Jalan melewati loket tiket lalu belok kiri.',
        },
      ],
    },
    {
      code: 'EFT-405',
      title: 'Petunjuk Langkah demi Langkah',
      skill: 'READING',
      cefr: 'A2',
      estMinutes: 6,
      body: `Petunjuk yang jelas tersusun berurutan supaya tamu tidak tersesat:

1. Mulai dari posisi tamu sekarang
2. Beri arah satu per satu (*go straight*, *turn right*)
3. Sebut titik acuan yang dilewati (*past the cafe*)
4. Tutup dengan posisi tujuan (*next to*, *opposite*)

## Contoh

:::phrases
- To get to the currency exchange, go straight past the cafe, turn right at the corner, and it's right next to the pharmacy. | Untuk menuju ke tempat penukaran uang, jalan lurus melewati kafe, belok kanan di pojokan, dan letaknya persis di sebelah apotek.
- The bus is parked just outside Gate 3, opposite the information desk. | Bus kita terparkir tepat di luar Pintu 3, berseberangan dengan meja informasi.
:::

:::tip
Hindari petunjuk samar seperti *"It's over there somewhere."* Sebutkan arah dan titik acuan yang jelas.
:::

:::dialog
Mr. Lee (Tamu): Where is our bus?
Kamu (Tour Leader): The bus is parked just outside Gate 3, opposite the information desk.
:::

Di kuis, baca denah lantai dasar sebuah mal lalu jawab pertanyaannya.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is right in front of the main entrance?',
          options: [
            'The cafe',
            'The pharmacy',
            'The information desk',
            'The restrooms',
          ],
          answerKey: 'C',
          passage: MALL,
          explanation:
            '"The information desk is right in front of you" — tepat di depan pintu masuk utama.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where do you turn right to find the currency exchange?',
          options: [
            'At the cafe',
            'At the corner',
            'At the information desk',
            'At the escalator',
          ],
          answerKey: 'B',
          passage: MALL,
          explanation: '"At the corner, turn right." = belok kanan di pojokan.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What is right next to the currency exchange?',
          options: [
            'The pharmacy',
            'The restrooms',
            'The cafe',
            'The food court',
          ],
          answerKey: 'A',
          passage: MALL,
          explanation:
            '"The pharmacy is the first shop on the corner, and the currency exchange is right next to it."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where are the restrooms?',
          options: [
            'Next to the cafe',
            'Behind the information desk',
            'On the second floor',
            'Opposite the currency exchange',
          ],
          answerKey: 'D',
          passage: MALL,
          explanation:
            '"The restrooms are opposite the currency exchange." = toilet di seberang tempat penukaran uang.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How do you get to the food court?',
          options: [
            'Turn left at the corner',
            'Take the escalator up to the second floor',
            'Walk past the pharmacy',
            'Go out through the main entrance',
          ],
          answerKey: 'B',
          passage: MALL,
          explanation:
            '"To get there, take the escalator up to the second floor."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Which instruction is the clearest for a guest?',
          options: [
            "It's over there somewhere.",
            'Just walk and you will find it.',
            'Go straight past the cafe, turn right at the corner, and it is next to the pharmacy.',
            'It is near. Please ask someone.',
          ],
          answerKey: 'C',
          explanation:
            'Petunjuk jelas = arah berurutan + titik acuan + posisi tujuan.',
        },
        {
          type: 'ISIAN',
          prompt:
            'The bus is parked just ___ Gate 3, opposite the information desk. (di luar)',
          answerKey: 'outside',
          explanation: '"Just outside Gate 3" = tepat di luar Pintu 3.',
        },
        {
          type: 'SUSUN_KALIMAT',
          prompt: SUSUN,
          answerKey: "It's right next to the pharmacy",
          explanation:
            '"It\'s right next to the pharmacy." = Letaknya persis di sebelah apotek.',
        },
      ],
    },
    {
      code: 'EFT-406',
      title: 'Menyimak: Petunjuk di Bandara',
      skill: 'LISTENING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Rombongan baru mendarat. Rina, tour leader, menjawab pertanyaan arah dari tamu dan memberi pengumuman di bandara.

Saat menyimak petunjuk arah, tangkap tiga hal:

1. **Kata kerja arah**: go straight, turn left, take the escalator, cross
2. **Titik acuan**: coffee shop, customs area, information desk
3. **Kata depan tempat**: next to, opposite, in front of

:::phrases
- Turn left after the coffee shop. | Belok kiri setelah kedai kopi.
- Walk past the customs area. | Jalan melewati area bea cukai.
- Our meeting point is in front of the blue pillar. | Titik kumpul kita di depan pilar biru.
- Cross the road, and the bus is on your right-hand side. | Seberangi jalan, dan bus ada di sisi kanan Anda.
:::

:::tip
Kalau ragu, minta tamu mengulang petunjukmu: *"So, you go straight and turn left, right?"* Ini memastikan mereka paham.
:::

Di kuis, dengarkan rekamannya lalu jawab ke mana tamu harus pergi.`,
      items: [
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where is the restroom?',
          options: [
            'Next to the prayer room',
            'Next to the coffee shop',
            'Opposite the prayer room',
            'Behind the check-in counter',
          ],
          answerKey: 'A',
          tts: `Mrs. Wilson: Excuse me, Rina. Where is the nearest restroom?
Rina: Go straight ahead and turn left after the coffee shop. The restroom is next to the prayer room.`,
          explanation:
            '"The restroom is next to the prayer room." Kedai kopi hanya titik untuk belok.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where is the meeting point?',
          options: [
            'Inside the customs area',
            'At the luggage belt',
            'Behind the exit doors',
            'In front of the blue pillar',
          ],
          answerKey: 'D',
          tts: 'Ladies and gentlemen, after you collect your luggage, please walk past the customs area and go through the exit doors. Our meeting point is in front of the blue pillar.',
          explanation:
            '"Our meeting point is in front of the blue pillar." = titik kumpul di depan pilar biru.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'How does Mr. Davis get to the bus parking area?',
          options: [
            'Take the escalator up and turn left',
            'Take the elevator down to the basement',
            'Take the escalator down and cross the road',
            'Walk past the coffee shop',
          ],
          answerKey: 'C',
          tts: `Mr. Davis: Is the bus parking area far from here?
Rina: Not at all. Take the escalator down to the ground floor and cross the road. The bus is parked on your right-hand side.`,
          explanation:
            '"Take the escalator down to the ground floor and cross the road."',
        },
        {
          type: 'ISIAN',
          prompt: 'The bus is parked just outside Gate ___.',
          answerKey: '5',
          acceptedAnswers: ['five'],
          tts: 'Our bus is parked just outside Gate 5, opposite the taxi stand. Please follow me.',
          explanation:
            '"Just outside Gate 5, opposite the taxi stand" = tepat di luar Pintu 5, di seberang pangkalan taksi.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'What should Mrs. Wilson walk past?',
          options: [
            'The pharmacy',
            'The bookshop',
            'The currency exchange',
            'The bus stop',
          ],
          answerKey: 'B',
          tts: `Mrs. Wilson: Could you tell me how to get to the currency exchange?
Rina: Sure. Go straight past the bookshop, then turn right at the corner. It's right next to the pharmacy.`,
          explanation:
            '"Go straight past the bookshop" = jalan lurus melewati toko buku. Apotek ada di sebelah tujuannya.',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where should guests go if they get lost?',
          options: [
            'To the bus',
            'To the coffee shop',
            'To the exit doors',
            'To the information desk on the first floor',
          ],
          answerKey: 'D',
          tts: 'Please be back at the meeting point at half past eleven. If you get lost, go to the information desk on the first floor and ask them to call me.',
          explanation:
            '"If you get lost, go to the information desk on the first floor."',
        },
        {
          type: 'PILIHAN_GANDA',
          prompt: 'Where is the souvenir shop?',
          options: [
            'On the second floor, opposite the food court',
            'On the ground floor, next to the food court',
            'In the basement, behind the escalator',
            'On the second floor, behind the food court',
          ],
          answerKey: 'A',
          tts: `Mr. Davis: Which way should I go to find the souvenir shop?
Rina: Take the escalator up to the second floor. The souvenir shop is opposite the food court.`,
          explanation:
            '"Take the escalator up to the second floor. The souvenir shop is opposite the food court."',
        },
      ],
    },
    {
      code: 'EFT-407',
      title: 'Ucapkan: Memberi Petunjuk Arah',
      skill: 'SPEAKING',
      cefr: 'A2',
      estMinutes: 5,
      body: `Bab terakhir: latih pelafalan. Tekan 🔊 untuk mendengar contoh, lalu tirukan dengan suaramu sendiri di kuis.

:::phrases
- Go straight ahead until you reach the main lobby. | Jalan lurus terus sampai Anda tiba di lobi utama.
- Turn left at the next intersection. | Belok kiri di persimpangan berikutnya.
- Walk past the ticketing booth, and you will see it. | Jalan melewati loket tiket, dan Anda akan melihatnya.
- Take the escalator down to the basement level. | Gunakan eskalator turun ke lantai basement.
- The bus is parked opposite the information desk. | Bus terparkir di seberang meja informasi.
- Turn right at the corner, and it's right next to the pharmacy. | Belok kanan di pojokan, dan letaknya persis di sebelah apotek.
:::

:::tip
Bicara pelan dan tekankan kata arah (**left**, **right**, **straight**) serta nama titik acuan. Sambil bicara, tunjuk arahnya dengan tangan.
:::`,
      items: [
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Go straight ahead until you reach the main lobby',
          explanation: 'Arah lurus sampai titik tujuan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Turn left at the next intersection',
          explanation: 'Arah belok di persimpangan.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Walk past the ticketing booth, and you will see it',
          explanation: 'Memakai titik acuan yang dilewati.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'Take the escalator down to the basement level',
          explanation: 'Arah pindah lantai.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey: 'The bus is parked opposite the information desk',
          explanation: 'Posisi bus dengan kata depan tempat.',
        },
        {
          type: 'UCAPAN',
          prompt: UCAP,
          answerKey:
            "Turn right at the corner, and it's right next to the pharmacy",
          explanation: 'Penutup petunjuk: posisi tujuan.',
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
