import * as ExcelJS from 'exceljs';
import * as path from 'path';

const HEADERS = [
  'lesson_code',
  'lesson_title',
  'topic',
  'level',
  'cefr',
  'skill',
  'item_order',
  'type',
  'prompt',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'answer',
  'accepted_answers',
  'explanation',
  'media_file',
  'passage',
];

const EXAMPLES = [
  [
    'BUS-01',
    'Email Perkenalan',
    'Business English',
    'menengah',
    'B1',
    'vocabulary',
    '1',
    'pilihan_ganda',
    'What does "schedule" mean?',
    'Jadwal',
    'Pertemuan',
    'Perjalanan',
    'Tujuan',
    'A',
    '',
    '"Schedule" berarti jadwal — daftar waktu kegiatan.',
    '',
    '',
  ],
  [
    'BUS-01',
    'Email Perkenalan',
    'Business English',
    'menengah',
    'B1',
    'vocabulary',
    '2',
    'isian',
    'Please ___ the report before Friday.',
    '',
    '',
    '',
    '',
    'submit',
    'submit;send;hand in',
    '"Submit" = menyerahkan. Umum dipakai untuk laporan.',
    '',
    '',
  ],
  [
    'BUS-01',
    'Email Perkenalan',
    'Business English',
    'menengah',
    'B1',
    'vocabulary',
    '3',
    'susun_kalimat',
    'Susun kalimat berikut:',
    '',
    '',
    '',
    '',
    'I will send the report tomorrow',
    '',
    'Pola: Subject + will + verb. "Will" untuk rencana.',
    '',
    '',
  ],
  [
    'LIS-01',
    'Sapaan di Telepon',
    'Phone English',
    'dasar',
    'A2',
    'listening',
    '1',
    'pilihan_ganda',
    'Dengarkan audio. Siapa yang menelepon?',
    'Mr. Tanaka',
    'Ms. Sari',
    'Mr. Budi',
    'Ms. Rina',
    'B',
    '',
    'Penelepon menyebut namanya di detik ke-3.',
    'audio_001.mp3',
    '',
  ],
  [
    'RD-01',
    'Memo Kantor',
    'Office English',
    'menengah',
    'B1',
    'reading',
    '1',
    'pilihan_ganda',
    'Baca teks. Kapan rapat diadakan?',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'C',
    '',
    'Kalimat kedua memo menyebut "Wednesday".',
    '',
    'MEMO: The monthly meeting is moved. It will be held on Wednesday at 10 AM in Room 3.',
  ],
];

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Soal');
  ws.addRow(HEADERS).font = { bold: true };
  EXAMPLES.forEach((r) => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns.forEach((c, i) => {
    c.width = [
      12, 20, 18, 10, 6, 12, 10, 14, 40, 14, 14, 14, 14, 10, 24, 40, 16, 50,
    ][i];
  });
  const dropdown = (col: string, list: string[]) => {
    for (let row = 2; row <= 500; row++)
      ws.getCell(`${col}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${list.join(',')}"`],
      };
  };
  dropdown('D', ['dasar', 'menengah', 'mahir']);
  dropdown('E', ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  dropdown('F', ['vocabulary', 'grammar', 'listening', 'reading']);
  dropdown('H', ['pilihan_ganda', 'isian', 'susun_kalimat']);

  const pj = wb.addWorksheet('Petunjuk');
  [
    ['Kolom', 'Aturan'],
    [
      'lesson_code',
      'Kode unik lesson, mis. BUS-01. Baris dengan kode sama = satu lesson (8–10 soal).',
    ],
    [
      'level / cefr / skill / type',
      'Pilih dari dropdown. Jangan mengetik nilai lain.',
    ],
    ['item_order', 'Nomor urut soal di dalam lesson: 1, 2, 3, …'],
    [
      'prompt',
      'Teks soal. Untuk isian, tulis ___ (3 underscore) di bagian yang dikosongkan.',
    ],
    ['option_a–d', 'Hanya untuk pilihan_ganda. Keempatnya wajib diisi.'],
    [
      'answer',
      'pilihan_ganda: A/B/C/D · isian: jawaban utama · susun_kalimat: kalimat lengkap yang benar (min. 3 kata).',
    ],
    [
      'accepted_answers',
      'Hanya isian: variasi jawaban yang diterima, dipisah titik-koma. Contoh: submit;send',
    ],
    [
      'explanation',
      'WAJIB. Jelaskan kenapa jawabannya benar — muncul ke karyawan saat menjawab salah.',
    ],
    [
      'media_file',
      'Nama file audio/gambar persis seperti yang diunggah admin. Kosongkan jika tidak ada.',
    ],
    ['passage', 'Teks bacaan untuk soal reading. Kosongkan jika tidak ada.'],
  ].forEach((r) => pj.addRow(r));
  pj.getRow(1).font = { bold: true };
  pj.getColumn(1).width = 22;
  pj.getColumn(2).width = 90;

  const outPath = path.resolve(
    __dirname,
    '../../../deliverables/template-soal-v1.xlsx',
  );
  await wb.xlsx.writeFile(outPath);
  console.log(`template written: ${outPath}`);
}
void main();
