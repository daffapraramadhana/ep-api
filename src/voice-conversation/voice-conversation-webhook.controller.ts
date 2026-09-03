import {
  Controller,
  HttpCode,
  Headers,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
// `import type` wajib: keduanya cuma dipakai di posisi tipe parameter
// ber-dekorator (`emitDecoratorMetadata` + `isolatedModules` menuntut ini).
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { VoiceConversationService } from './voice-conversation.service';
import { verifyWebhookSignature } from './webhook-verifier';

/**
 * Endpoint PUBLIK pertama di codebase ini — sengaja TANPA @UseGuards dan
 * sengaja di controller/file sendiri supaya tidak pernah bercampur visual
 * dengan route ber-JWT (tidak ada APP_GUARD global di main.ts/app.module,
 * jadi route ini publik murni karena memang tidak di-guard). Aman KARENA
 * verifikasi signature HMAC di bawah: body tanpa `ElevenLabs-Signature` valid
 * → 401 tanpa diproses.
 *
 * dibaca lewat `req.rawBody` (buffer) — Nest diboot dengan `rawBody: true`
 * di main.ts DAN di harness e2e, jadi signature selalu diverifikasi atas
 * bytes mentah, bukan JSON hasil serialize-ulang (yang bisa mismatch byte).
 * `rawBody: true` tidak menyentuh upload multipart (multer), jadi upload
 * audio 10MB di route lain tidak ter-buffer ganda.
 */
@Controller('voice-conversation/webhook')
export class VoiceConversationWebhookController {
  private logger = new Logger('VoiceWebhook');

  constructor(private svc: VoiceConversationService) {}

  // TODO(dbg-webhook): hapus blok logger di handle() setelah format signature
  // asli ElevenLabs terkonfirmasi (lihat ponytail di webhook-verifier.ts).
  private debugSignature(raw: Buffer | undefined, signature: string | undefined): void {
    const bodyHash =
      raw && raw.length > 0
        ? require('crypto').createHash('sha256').update(raw).digest('hex').slice(0, 12)
        : 'NO_BODY';
    this.logger.warn(
      `signature mismatch — header="${signature ?? 'UNDEFINED'}" bodySha256[:12]="${bodyHash}"`,
    );
  }

  @Post('elevenlabs')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('elevenlabs-signature') signature: string | undefined,
  ): Promise<{ ok: true }> {
    const raw = req.rawBody;
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (!raw || raw.length === 0) throw new UnauthorizedException('Body kosong');
    if (!secret) {
      throw new InternalServerErrorException('ELEVENLABS_WEBHOOK_SECRET belum diset');
    }
    if (!verifyWebhookSignature(raw, signature, secret)) {
      this.debugSignature(raw, signature);
      throw new UnauthorizedException('Signature tidak valid');
    }
    // Signature valid → proses (gradeFromWebhook sendiri selalu ack row yang
    // "bukan milik kita"/retry, supaya ElevenLabs tidak retry-storm). Hanya
    // signature invalid yang boleh menghasilkan non-200.
    const payload = JSON.parse(raw.toString('utf8')) as unknown;
    await this.svc.gradeFromWebhook(payload);
    return { ok: true };
  }
}
