import { Injectable } from '@nestjs/common';

/**
 * Injeksi klien ElevenLabs via token (pola identik STT_TRANSCRIBER di
 * groq-stt.service) supaya test e2e bisa override dengan fake — ElevenLabs
 * tidak pernah dipanggil asli saat test.
 */
export const ELEVENLABS_CLIENT = Symbol('ELEVENLABS_CLIENT');

export interface ElevenLabsClient {
  getSignedUrl(agentId: string): Promise<string>;
  /**
   * Tarik detail satu percakapan (GET /v1/convai/conversations/:id) — dipakai
   * fallback reconcile: webhook tak sampai → BE grade sendiri dari data yang
   * sama (durasi + transcript) saat client polling status. null bila
   * percakapan sudah tak dikenal (404).
   */
  getConversation(conversationId: string): Promise<unknown | null>;
}

@Injectable()
export class ElevenLabsService implements ElevenLabsClient {
  /**
   * Mint signed URL sekali-pakai untuk satu percakapan — browser memakainya
   * untuk connect ke agent, dan TIDAK pernah memegang ELEVENLABS_API_KEY.
   * Fetch mentah (satu GET, tanpa SDK — tidak ada alasan tambah dependency).
   */
  async getSignedUrl(agentId: string): Promise<string> {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY belum diset');
    }
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } },
    );
    if (!res.ok) {
      throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as { signed_url?: string };
    if (!json.signed_url) throw new Error('ElevenLabs signed_url kosong di respons');
    return json.signed_url;
  }

  /**
   * Detail percakapan — field di respons top-level (BUKAN wrapper `data`
   * seperti webhook): status, conversation_id, transcript[], metadata.
   * Service reconcile yang menyusun ulang jadi bentuk payload gradeFromWebhook.
   */
  async getConversation(conversationId: string): Promise<unknown | null> {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY belum diset');
    }
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json();
  }
}
