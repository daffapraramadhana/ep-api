import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

/**
 * S3-compatible driver (Cloudflare R2, MinIO, AWS S3, ...). Activated via
 * STORAGE_DRIVER=s3. Same public contract as LocalStorageService so
 * consumers (MediaController, ImportService, ContentService) never
 * branch on which driver is active.
 */
@Injectable()
export class S3StorageService extends StorageService {
  readonly servesLocally = false;

  private client = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    },
  });

  private bucket = process.env.S3_BUCKET ?? '';

  private safe(name: string): string {
    // tolak path traversal — sama seperti driver local
    return name.split('/').pop() ?? name;
  }

  async put(name: string, buf: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.safe(name),
        Body: buf,
      }),
    );
  }

  async exists(name: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.safe(name) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async listNames(): Promise<string[]> {
    const names: string[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) names.push(obj.Key);
      }
      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);
    return names;
  }

  async stat(name: string): Promise<{ size: number }> {
    const res = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.safe(name) }),
    );
    return { size: res.ContentLength ?? 0 };
  }

  getUrl(name: string): string {
    return `${process.env.S3_PUBLIC_URL}/${name}`;
  }
}
