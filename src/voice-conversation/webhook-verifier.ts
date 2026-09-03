import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifikasi signature webhook ElevenLabs: HMAC-SHA256(secret, rawBody), hex,
 * dibandingkan constant-time (timingSafeEqual — bukan `===` yang bocor timing).
 *
 * ponytail: ElevenLabs TIDAK mempublikasikan format wire signature-nya (docs
 * mereka menyuruh pakai SDK verifier, tapi package JS v1.59 tidak memuatnya),
 * dan docs menyebut timestamp ikut divalidasi. Implementasi di bawah adalah
 * interpretasi kami (HMAC polos atas raw body). WAJIB konfirmasi via fitur
 * "send test webhook" di dashboard ElevenLabs SEBELUM fitur dinyalakan
 * (VOICE_AGENT_ENABLED=1): bila header asli berformat `t=...,v=...` (gaya
 * Stripe) atau memakai skema lain, HANYA fungsi ini yang perlu diubah — semua
 * konsumen memanggilnya lewat satu titik. Sampai dikonfirmasi, mismatch hanya
 * berarti request ditolak (401), tidak mengekspos apa pun.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
