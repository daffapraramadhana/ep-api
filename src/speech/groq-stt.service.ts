import { Injectable } from '@nestjs/common';

/**
 * Injeksi STT via token (pola identik STREAK_EVALUATOR di answer.service)
 * supaya test e2e bisa override dengan fake — Groq tidak pernah dipanggil
 * saat test.
 */
export const STT_TRANSCRIBER = Symbol('STT_TRANSCRIBER');

export interface SttTranscriber {
  transcribe(buffer: Buffer, mimeType: string): Promise<string>;
}

@Injectable()
export class GroqSttService implements SttTranscriber {
  /**
   * Transcribe audio via Groq Whisper (fetch global Node 22, tanpa SDK).
   * `language: 'en'` — materi drill berbahasa Inggris.
   */
  async transcribe(buffer: Buffer, mimeType: string): Promise<string> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY belum diset');
    }
    const form = new FormData();
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'en');
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      `record${extOf(mimeType)}`,
    );
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Groq STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as { text?: string };
    return (json.text ?? '').trim();
  }
}

function extOf(mimeType: string): string {
  switch (mimeType) {
    case 'audio/webm':
      return '.webm';
    case 'audio/mp4':
      return '.m4a';
    default:
      return '.webm';
  }
}
