import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
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
    return fs.readdir(this.dir);
  }

  async stat(name: string) {
    return fs.stat(this.safe(name));
  }

  getUrl(name: string): string {
    return `/media/${name}`;
  }
}
