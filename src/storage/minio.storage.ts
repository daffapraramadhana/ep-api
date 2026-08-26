import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { StorageService } from './storage.service';

/**
 * Driver MinIO internal (bucket.mdd.co.id) — dipilih via STORAGE_DRIVER=minio,
 * konfigurasi lewat env MINIO_* (konvensi yang sama dengan proyek explorin).
 * File diakses langsung lewat URL publik bucket (anonymous read harus aktif
 * untuk bucket ini: `mc anonymous set download <alias>/<bucket>`), sehingga
 * servesLocally=false seperti driver S3.
 */

const CONTENT_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function contentTypeFor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

@Injectable()
export class MinioStorageService extends StorageService {
  readonly servesLocally = false;

  private client = new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? '',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL !== 'false',
    accessKey: process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.MINIO_SECRET_KEY ?? '',
  });

  private bucket = process.env.MINIO_BUCKET ?? '';
  private publicBase = (process.env.MINIO_PUBLIC_BASE_URL ?? '').replace(
    /\/$/,
    '',
  );

  private safe(name: string): string {
    // tolak path traversal — sama seperti driver local & s3
    return name.split('/').pop() ?? name;
  }

  async put(name: string, buf: Buffer): Promise<void> {
    const key = this.safe(name);
    await this.client.putObject(this.bucket, key, buf, buf.length, {
      'Content-Type': contentTypeFor(key),
    });
  }

  async exists(name: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, this.safe(name));
      return true;
    } catch {
      return false;
    }
  }

  async listNames(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const names: string[] = [];
      const stream = this.client.listObjectsV2(this.bucket);
      stream.on('data', (obj: { name?: string }) => {
        if (obj.name) names.push(obj.name);
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(names));
    });
  }

  async stat(name: string): Promise<{ size: number }> {
    const res = await this.client.statObject(this.bucket, this.safe(name));
    return { size: res.size ?? 0 };
  }

  getUrl(name: string): string {
    return `${this.publicBase}/${this.bucket}/${name}`;
  }
}
