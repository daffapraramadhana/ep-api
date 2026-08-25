import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  readonly servesLocally = true;

  private dir = process.env.STORAGE_DIR ?? './storage';

  private safe(name: string) {
    const base = path.basename(name); // tolak path traversal
    return path.join(this.dir, base);
  }

  async put(name: string, buf: Buffer): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.safe(name), buf);
  }

  async exists(name: string): Promise<boolean> {
    try {
      await fs.access(this.safe(name));
      return true;
    } catch {
      return false;
    }
  }

  async listNames(): Promise<string[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const names = await fs.readdir(this.dir);
    // Skip hidden/system files (.DS_Store, .gitkeep, ...) — they're not
    // media and would otherwise show up in /admin/media and fail stat()
    // assumptions elsewhere.
    return names.filter((n) => !n.startsWith('.'));
  }

  async stat(name: string) {
    return fs.stat(this.safe(name));
  }

  getUrl(name: string): string {
    return `/media/${name}`;
  }
}
