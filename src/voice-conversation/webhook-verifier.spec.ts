import { createHmac } from 'crypto';
import { verifyWebhookSignature } from './webhook-verifier';

describe('verifyWebhookSignature', () => {
  const secret = 'webhook-super-secret';
  const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));

  it('menerima signature HMAC yang benar', () => {
    const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, sig, secret)).toBe(true);
  });

  it('menolak signature salah', () => {
    const sig = createHmac('sha256', 'kunci-lain').update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, sig, secret)).toBe(false);
  });

  it('menolak body yang diubah (tamper) walau signature tetap', () => {
    const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
    const tampered = Buffer.from(rawBody.toString('utf8').replace('world', 'earth'));
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });

  it('menolak signature kosong/undefined', () => {
    expect(verifyWebhookSignature(rawBody, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, '', secret)).toBe(false);
  });

  it('menolak signature panjang beda (padding attack guard)', () => {
    const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, sig + '00', secret)).toBe(false);
  });
});
