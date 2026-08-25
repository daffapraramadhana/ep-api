import * as ExcelJS from 'exceljs';
import { RawRow } from './row-validator';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Unwraps an ExcelJS cell value into the plain string RawRow expects.
 * Handles the shapes ExcelJS can hand back beyond primitives:
 *  - rich text: { richText: [{ text, font }, ...] } → concatenated text
 *  - formula:   { formula, result } → the computed result (recursively
 *    unwrapped, since result can itself be a date/string/number)
 *  - hyperlink: { text, hyperlink } → the display text
 *  - Date object (numeric/date-formatted cells) → 'yyyy-mm-dd'
 */
export function unwrapCellValue(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return dateToIso(v);
  if (typeof v === 'object') {
    const obj = v as unknown as Record<string, unknown>;
    if (Array.isArray((obj as any).richText)) {
      return (obj as any).richText
        .map((run: { text?: string }) => run.text ?? '')
        .join('');
    }
    if ('formula' in obj) {
      return unwrapCellValue((obj as any).result as ExcelJS.CellValue);
    }
    if ('text' in obj) {
      return String((obj as any).text ?? '');
    }
    return String(v);
  }
  return String(v);
}

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
      r[h] = unwrapCellValue(v).trim();
    });
    if (Object.values(r).some((x) => x !== '')) rows.push(r);
  });
  return rows;
}
