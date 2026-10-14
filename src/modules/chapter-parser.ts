// apps/api/src/modules/chapter-parser.ts
import MarkdownIt from 'markdown-it';

/**
 * Parser bab modul (spec §4). Fungsi MURNI: Markdown → blok bertipe, atau
 * daftar error bernomor baris. Dipakai simpan, pratinjau admin, dan seeder —
 * satu jalur validasi. Keberadaan file media dicek pemanggil (async) lewat
 * `media`.
 *
 * Directive (:::phrases / :::dialog / :::tip) dipotong lebih dulu dengan
 * pemindai baris sendiri — markdown-it-container menutup blok diam-diam di
 * akhir dokumen, padahal kita butuh error "belum ditutup".
 */

export type Inline = {
  t: string;
  b?: true;
  i?: true;
  code?: true;
  href?: string;
}[];

export type StoredBlock =
  | { type: 'heading'; level: 2 | 3; text: Inline }
  | { type: 'paragraph'; text: Inline }
  | { type: 'list'; ordered: boolean; items: Inline[] }
  | { type: 'table'; head: Inline[]; rows: Inline[][] }
  | { type: 'image'; file: string; alt: string }
  | { type: 'audio'; file: string }
  | { type: 'phrases'; items: { en: string; id: string; note?: string }[] }
  | {
      type: 'dialog';
      lines: {
        speaker: string;
        role?: string;
        side: 'left' | 'right';
        text: string;
      }[];
    }
  | { type: 'tip'; text: Inline[] };

export interface ParseError {
  line: number;
  message: string;
}
export interface MediaRef {
  file: string;
  line: number;
}
export type ParseResult =
  | { ok: true; blocks: StoredBlock[]; media: MediaRef[] }
  | { ok: false; errors: ParseError[] };

type Token = ReturnType<MarkdownIt['parse']>[number];

const DIRECTIVES = ['phrases', 'dialog', 'tip'];
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|webm)$/i;
// `::: tip` (spasi) adalah gaya umum sumber luar (markdown-it-container, VuePress).
const OPEN_RE = /^:::\s*([A-Za-z][\w-]*)\s*$/;
const DIALOG_RE = /^([^:()]+?)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/;

const md = new MarkdownIt('default', {
  html: false,
  linkify: false,
  typographer: false,
});
// Validasi tautan dilakukan di toInline supaya bisa melaporkan nomor baris
// (validateLink bawaan diam-diam membuang tautan javascript:).
md.validateLink = () => true;

const UNSUPPORTED: Record<string, string> = {
  blockquote_open: 'kutipan',
  code_block: 'blok kode',
  fence: 'blok kode',
  hr: 'garis pemisah',
  html_block: 'HTML',
};

const LIST_UNSUPPORTED: Record<string, string> = {
  ...UNSUPPORTED,
  heading_open: 'judul',
  table_open: 'tabel',
};

/** markdown-it meng-encode tujuan tautan (spasi → %20, é → %C3%A9); nama file Media asli tidak. */
function decodeMediaName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

interface Ctx {
  blocks: StoredBlock[];
  errors: ParseError[];
  media: MediaRef[];
}

export function parseChapter(body: string): ParseResult {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  if (!lines.some((l) => l.trim())) {
    return {
      ok: false,
      errors: [{ line: 1, message: 'Isi bab masih kosong' }],
    };
  }
  const ctx: Ctx = { blocks: [], errors: [], media: [] };

  let mdStart = 0;
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === ':::') {
      ctx.errors.push({
        line: i + 1,
        message: '":::" penutup tanpa blok pembuka',
      });
      convertMarkdown(lines.slice(mdStart, i), mdStart, ctx);
      i += 1;
      mdStart = i;
      continue;
    }
    const open = OPEN_RE.exec(t);
    if (!open) {
      i += 1;
      continue;
    }
    convertMarkdown(lines.slice(mdStart, i), mdStart, ctx);
    const name = open[1];
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== ':::' &&
      !OPEN_RE.test(lines[j].trim())
    )
      j += 1;
    if (j >= lines.length || lines[j].trim() !== ':::') {
      ctx.errors.push({
        line: i + 1,
        message: `Blok ":::${name}" belum ditutup dengan ":::"`,
      });
      // Bila berhenti karena ada pembuka lain di baris j, blok itu dilewati
      // utuh (sampai penutupnya) — isinya ambigu, satu error sudah cukup.
      const resume = j < lines.length ? nextAfterClose(lines, j) : lines.length;
      i = resume;
      mdStart = resume;
      continue;
    }
    if (!DIRECTIVES.includes(name)) {
      ctx.errors.push({
        line: i + 1,
        message: `Blok ":::${name}" tidak dikenal (pakai phrases, dialog, atau tip)`,
      });
    } else {
      convertDirective(name, lines.slice(i + 1, j), i + 1, ctx);
    }
    i = j + 1;
    mdStart = i;
  }
  convertMarkdown(lines.slice(mdStart), mdStart, ctx);

  if (ctx.errors.length) {
    ctx.errors.sort((a, b) => a.line - b.line);
    return { ok: false, errors: ctx.errors };
  }
  return { ok: true, blocks: ctx.blocks, media: ctx.media };
}

/** Indeks baris setelah penutup ":::" pertama mulai dari `from`, atau akhir. */
function nextAfterClose(lines: string[], from: number): number {
  for (let k = from + 1; k < lines.length; k++)
    if (lines[k].trim() === ':::') return k + 1;
  return lines.length;
}

/** `fenceLine` = nomor baris (1-based) pembuka `:::name`; isi mulai fenceLine + 1. */
function convertDirective(
  name: string,
  content: string[],
  fenceLine: number,
  ctx: Ctx,
) {
  const fenceIdx = fenceLine;
  const rows = content
    .map((text, k) => ({ text: text.trim(), line: fenceIdx + 1 + k }))
    .filter((r) => r.text);
  if (!rows.length) {
    ctx.errors.push({
      line: fenceLine,
      message: `Blok ":::${name}" masih kosong`,
    });
    return;
  }

  if (name === 'phrases') {
    const items: { en: string; id: string; note?: string }[] = [];
    for (const r of rows) {
      const parts = r.text
        .replace(/^[-*]\s+/, '')
        .split('|')
        .map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        ctx.errors.push({
          line: r.line,
          message: 'Frasa harus berformat "EN | arti"',
        });
        continue;
      }
      items.push(
        parts[2]
          ? { en: parts[0], id: parts[1], note: parts[2] }
          : { en: parts[0], id: parts[1] },
      );
    }
    if (items.length) ctx.blocks.push({ type: 'phrases', items });
    return;
  }

  if (name === 'dialog') {
    const sides = new Map<string, 'left' | 'right'>();
    const out: {
      speaker: string;
      role?: string;
      side: 'left' | 'right';
      text: string;
    }[] = [];
    for (const r of rows) {
      const m = DIALOG_RE.exec(r.text);
      if (!m) {
        ctx.errors.push({
          line: r.line,
          message: 'Baris dialog harus berformat "Nama (peran): teks"',
        });
        continue;
      }
      const speaker = m[1].trim();
      const key = speaker.toLowerCase();
      if (!sides.has(key)) {
        if (sides.size >= 2) {
          ctx.errors.push({
            line: r.line,
            message: 'Dialog maksimal 2 pembicara per blok',
          });
          continue;
        }
        sides.set(key, sides.size === 0 ? 'left' : 'right');
      }
      const role = m[2]?.trim();
      out.push({
        speaker,
        ...(role ? { role } : {}),
        side: sides.get(key)!,
        text: m[3].trim(),
      });
    }
    if (out.length) ctx.blocks.push({ type: 'dialog', lines: out });
    return;
  }

  // tip: hanya paragraf
  const tokens = md.parse(content.join('\n'), {});
  const paras: Inline[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    if (tok.type === 'paragraph_open') {
      const line = fenceIdx + 1 + (tok.map?.[0] ?? 0);
      paras.push(toInline(tokens[k + 1], line, ctx));
    } else if (
      tok.level === 0 &&
      !tok.type.endsWith('_close') &&
      tok.type !== 'inline'
    ) {
      ctx.errors.push({
        line: fenceIdx + 1 + (tok.map?.[0] ?? 0),
        message: 'Blok tip hanya boleh berisi teks',
      });
    }
  }
  if (paras.length) ctx.blocks.push({ type: 'tip', text: paras });
}

function convertMarkdown(chunk: string[], offset: number, ctx: Ctx) {
  if (!chunk.some((l) => l.trim())) return;
  const tokens = md.parse(chunk.join('\n'), {});
  const lineOf = (tok: Token) => offset + 1 + (tok.map?.[0] ?? 0);

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    if (tok.level !== 0) continue;

    if (UNSUPPORTED[tok.type]) {
      ctx.errors.push({
        line: lineOf(tok),
        message: `Format "${UNSUPPORTED[tok.type]}" belum didukung di bab`,
      });
      continue;
    }

    if (tok.type === 'heading_open') {
      const level = tok.tag === 'h1' || tok.tag === 'h2' ? 2 : 3;
      ctx.blocks.push({
        type: 'heading',
        level,
        text: toInline(tokens[k + 1], lineOf(tok), ctx),
      });
      continue;
    }

    if (tok.type === 'paragraph_open') {
      const inline = tokens[k + 1];
      const kids = (inline.children ?? []).filter(
        (c) => !(c.type === 'text' && !c.content.trim()),
      );
      if (kids.length === 1 && kids[0].type === 'image') {
        const img = kids[0];
        const src = img.attrGet('src') ?? '';
        if (!src.startsWith('media:') || src.length <= 6) {
          ctx.errors.push({
            line: lineOf(tok),
            message:
              'Gambar/audio harus dari Media: tulis ![keterangan](media:nama-file)',
          });
          continue;
        }
        const file = decodeMediaName(src.slice(6));
        ctx.media.push({ file, line: lineOf(tok) });
        ctx.blocks.push(
          AUDIO_EXT.test(file)
            ? { type: 'audio', file }
            : { type: 'image', file, alt: img.content },
        );
        continue;
      }
      ctx.blocks.push({
        type: 'paragraph',
        text: toInline(inline, lineOf(tok), ctx),
      });
      continue;
    }

    if (tok.type === 'bullet_list_open' || tok.type === 'ordered_list_open') {
      // Struktur yang didukung: list(0) > list_item(1) > paragraph(2) > inline(3).
      // Apa pun selain itu di dalam daftar dilaporkan — tidak boleh hilang diam-diam.
      const closeType = tok.type.replace('_open', '_close');
      const items: Inline[] = [];
      const before = ctx.errors.length;
      let nested = false;
      let parasInItem = 0;
      let e = k + 1;
      for (; e < tokens.length; e++) {
        const t = tokens[e];
        if (t.type === closeType && t.level === 0) break;
        const line = offset + 1 + (t.map?.[0] ?? 0);
        if (t.type === 'list_item_open' && t.level === 1) parasInItem = 0;
        else if (
          (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') &&
          t.level > 0
        )
          nested = true;
        else if (t.type === 'paragraph_open' && t.level === 2) {
          parasInItem += 1;
          if (parasInItem === 2)
            ctx.errors.push({
              line,
              message: 'Satu butir daftar hanya boleh satu paragraf',
            });
        } else if (t.type === 'inline' && t.level === 3) {
          if (parasInItem === 1) items.push(toInline(t, line, ctx));
        } else if (LIST_UNSUPPORTED[t.type] && !nested)
          ctx.errors.push({
            line,
            message: `Format "${LIST_UNSUPPORTED[t.type]}" belum didukung di dalam daftar`,
          });
      }
      if (nested)
        ctx.errors.push({
          line: lineOf(tok),
          message: 'Daftar bertingkat belum didukung',
        });
      else if (ctx.errors.length === before)
        ctx.blocks.push({
          type: 'list',
          ordered: tok.type === 'ordered_list_open',
          items,
        });
      k = e;
      continue;
    }

    if (tok.type === 'table_open') {
      const head: Inline[] = [];
      const rows: Inline[][] = [];
      let inHead = false;
      let row: Inline[] = [];
      let e = k + 1;
      for (; e < tokens.length && tokens[e].type !== 'table_close'; e++) {
        const t = tokens[e];
        if (t.type === 'thead_open') inHead = true;
        else if (t.type === 'thead_close') inHead = false;
        else if (t.type === 'tr_open') row = [];
        else if (t.type === 'tr_close' && !inHead) rows.push(row);
        else if (t.type === 'inline') {
          const cell = toInline(t, lineOf(tok), ctx);
          if (inHead) head.push(cell);
          else row.push(cell);
        }
      }
      ctx.blocks.push({ type: 'table', head, rows });
      k = e;
    }
  }
}

function toInline(inline: Token | undefined, line: number, ctx: Ctx): Inline {
  const out: Inline = [];
  let b = false;
  let it = false;
  let href: string | undefined;
  for (const c of inline?.children ?? []) {
    switch (c.type) {
      case 'text':
        if (c.content)
          out.push({
            t: c.content,
            ...(b ? { b: true } : {}),
            ...(it ? { i: true } : {}),
            ...(href ? { href } : {}),
          });
        break;
      case 'softbreak':
      case 'hardbreak':
        out.push({ t: ' ' });
        break;
      case 'strong_open':
        b = true;
        break;
      case 'strong_close':
        b = false;
        break;
      case 'em_open':
        it = true;
        break;
      case 'em_close':
        it = false;
        break;
      case 'code_inline':
        out.push({ t: c.content, code: true });
        break;
      case 'link_open': {
        const h = c.attrGet('href') ?? '';
        if (!/^https?:\/\//i.test(h)) {
          ctx.errors.push({
            line,
            message: 'Tautan harus diawali http:// atau https://',
          });
          href = undefined;
        } else href = h;
        break;
      }
      case 'link_close':
        href = undefined;
        break;
      case 'image':
        ctx.errors.push({
          line,
          message: 'Gambar harus berdiri di baris sendiri',
        });
        break;
      default:
        if (c.content) out.push({ t: c.content });
    }
  }
  return out;
}
