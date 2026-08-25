import * as ExcelJS from 'exceljs';
import { RawRow } from './row-validator';

export async function parseWorkbook(buf: Buffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);
  const ws =
    wb.worksheets.find((w) => w.name.toLowerCase() !== 'petunjuk') ??
    wb.worksheets[0];
  const headers: string[] = [];
  ws.getRow(1).eachCell((c, i) => {
    headers[i] = String(c.value ?? '')
      .trim()
      .toLowerCase();
  });
  const rows: RawRow[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const r: RawRow = {};
    headers.forEach((h, i) => {
      if (!h) return;
      const v = row.getCell(i).value;
      r[h] = (
        typeof v === 'object' && v !== null && 'text' in (v as any)
          ? (v as any).text
          : String(v ?? '')
      ).trim();
    });
    if (Object.values(r).some((x) => x !== '')) rows.push(r);
  });
  return rows;
}
