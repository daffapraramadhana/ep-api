import * as ExcelJS from 'exceljs';
import { parseWorkbook, unwrapCellValue } from './xlsx-parser';

const HEADERS = ['lesson_code', 'prompt', 'answer'];

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}

describe('xlsx-parser', () => {
  it('melewati sheet bernama Petunjuk dan membaca sheet soal', async () => {
    const wb = new ExcelJS.Workbook();
    const petunjuk = wb.addWorksheet('Petunjuk');
    petunjuk.addRow(['Ini adalah instruksi, bukan data soal.']);
    petunjuk.addRow(['lesson_code', 'prompt', 'answer']); // decoy header-ish row
    petunjuk.addRow(['SHOULD-NOT-APPEAR', 'x', 'y']);

    const soal = wb.addWorksheet('Soal');
    soal.addRow(HEADERS);
    soal.addRow(['L1', 'Hello?', 'Hi']);

    const rows = await parseWorkbook(await toBuffer(wb));
    expect(rows).toHaveLength(1);
    expect(rows[0].lesson_code).toBe('L1');
  });

  it('meng-flatten rich text menjadi satu string', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Soal');
    ws.addRow(HEADERS);
    const row = ws.addRow(['L1', '', 'placeholder']);
    row.getCell(2).value = {
      richText: [
        { text: 'Hello ' },
        { font: { bold: true }, text: 'World' },
      ],
    } as any;

    const rows = await parseWorkbook(await toBuffer(wb));
    expect(rows[0].prompt).toBe('Hello World');
  });

  it('melewati baris kosong', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Soal');
    ws.addRow(HEADERS);
    ws.addRow(['L1', 'Hello?', 'Hi']);
    ws.addRow(['', '', '']);
    ws.addRow(['L2', 'World?', 'Earth']);

    const rows = await parseWorkbook(await toBuffer(wb));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.lesson_code)).toEqual(['L1', 'L2']);
  });

  it('menggunakan hasil (result) untuk sel formula', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Soal');
    ws.addRow(HEADERS);
    const row = ws.addRow(['L1', 'Hello?', '']);
    row.getCell(3).value = { formula: 'UPPER("hi")', result: 'HI' } as any;

    const rows = await parseWorkbook(await toBuffer(wb));
    expect(rows[0].answer).toBe('HI');
  });

  it('mengubah sel Date menjadi string yyyy-mm-dd', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Soal');
    ws.addRow(HEADERS);
    const row = ws.addRow(['L1', 'Hello?', '']);
    row.getCell(3).value = new Date(2026, 0, 15); // 15 Jan 2026

    const rows = await parseWorkbook(await toBuffer(wb));
    expect(rows[0].answer).toBe('2026-01-15');
  });
});

describe('unwrapCellValue', () => {
  it('mengembalikan string kosong untuk null/undefined', () => {
    expect(unwrapCellValue(null)).toBe('');
    expect(unwrapCellValue(undefined)).toBe('');
  });

  it('meneruskan angka dan string apa adanya', () => {
    expect(unwrapCellValue(42)).toBe('42');
    expect(unwrapCellValue('abc')).toBe('abc');
  });

  it('menangani nilai hyperlink ({text, hyperlink})', () => {
    expect(
      unwrapCellValue({ text: 'klik', hyperlink: 'https://example.com' } as any),
    ).toBe('klik');
  });

  it('unwrap rekursif ketika result formula sendiri berupa Date', () => {
    const d = new Date(2026, 5, 1);
    expect(unwrapCellValue({ formula: 'TODAY()', result: d } as any)).toBe(
      '2026-06-01',
    );
  });
});
