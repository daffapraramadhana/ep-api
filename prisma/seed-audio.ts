import 'dotenv/config';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { Client as MinioClient } from 'minio';

/**
 * Helper audio bersama untuk seeder konten (seed-demo, seed-complaints):
 * TTS macOS `say` + `afconvert` → .m4a, disimpan mengikuti STORAGE_DRIVER
 * (minio → bucket, selain itu → STORAGE_DIR lokal).
 */

const STORAGE_DIR = process.env.STORAGE_DIR ?? './storage';

/** WAV PCM senyap 1 detik — fallback bila TTS macOS tak tersedia. */
export function silentWav(): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 detik
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

export function hasMacTts(): boolean {
  try {
    execFileSync('which', ['say'], { stdio: 'pipe' });
    execFileSync('which', ['afconvert'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Tujuan penyimpanan audio — cermin kecil dari driver storage BE. */
export type AudioStore = {
  label: string;
  exists(name: string): Promise<boolean>;
  putFile(name: string, localPath: string): Promise<void>;
  put(name: string, buf: Buffer): Promise<void>;
};

function audioContentType(name: string): string {
  return name.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav';
}

export function makeAudioStore(): AudioStore {
  if (process.env.STORAGE_DRIVER === 'minio') {
    const bucket = process.env.MINIO_BUCKET ?? '';
    const client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? '',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL !== 'false',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
    });
    return {
      label: `bucket MinIO "${bucket}"`,
      exists: (name) =>
        client.statObject(bucket, name).then(
          () => true,
          () => false,
        ),
      putFile: async (name, localPath) => {
        await client.fPutObject(bucket, name, localPath, {
          'Content-Type': audioContentType(name),
        });
      },
      put: async (name, buf) => {
        await client.putObject(bucket, name, buf, buf.length, {
          'Content-Type': audioContentType(name),
        });
      },
    };
  }
  return {
    label: `direktori "${STORAGE_DIR}"`,
    exists: async (name) => existsSync(path.join(STORAGE_DIR, name)),
    putFile: async (name, localPath) => {
      mkdirSync(STORAGE_DIR, { recursive: true });
      const target = path.join(STORAGE_DIR, name);
      if (path.resolve(localPath) !== path.resolve(target))
        copyFileSync(localPath, target);
    },
    put: async (name, buf) => {
      mkdirSync(STORAGE_DIR, { recursive: true });
      writeFileSync(path.join(STORAGE_DIR, name), buf);
    },
  };
}

/** Buat/temukan file audio untuk satu frasa; return nama file di storage. */
export async function makeAudio(
  baseName: string,
  text: string,
  useTts: boolean,
  store: AudioStore,
): Promise<string> {
  const m4aName = `${baseName}.m4a`;
  // Audio asli yang sudah ada di storage tujuan selalu menang — termasuk
  // .m4a hasil TTS Mac yang diunggah lebih dulu ke bucket staging.
  if (await store.exists(m4aName)) return m4aName;
  if (useTts) {
    mkdirSync(STORAGE_DIR, { recursive: true });
    const local = path.join(STORAGE_DIR, m4aName);
    if (!existsSync(local)) {
      const aiff = path.join(STORAGE_DIR, `${baseName}.aiff`);
      // Samantha = suara en-US default yang tersedia luas; rate sedikit pelan
      // agar ramah pembelajar.
      execFileSync('say', ['-v', 'Samantha', '-r', '150', '-o', aiff, text]);
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, local]);
      execFileSync('rm', ['-f', aiff]);
    }
    await store.putFile(m4aName, local);
    return m4aName;
  }
  const wavName = `${baseName}.wav`;
  if (!(await store.exists(wavName))) await store.put(wavName, silentWav());
  return wavName;
}

