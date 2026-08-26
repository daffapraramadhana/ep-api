import 'dotenv/config';
import { readdirSync } from 'fs';
import * as path from 'path';
import { Client } from 'minio';

/**
 * Unggah audio demo (dc-/wc-/pe-*.m4a hasil TTS Mac di STORAGE_DIR) ke
 * bucket MinIO — jalankan dari mesin dev dengan env MINIO_* terisi:
 *   npm run audio:push:minio
 * Setelah itu `npm run seed:demo` di server (STORAGE_DRIVER=minio) akan
 * memakai .m4a ini alih-alih WAV senyap. Idempoten: objek yang sudah ada
 * dilewati.
 */

const STORAGE_DIR = process.env.STORAGE_DIR ?? './storage';

async function main() {
  for (const key of ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET']) {
    if (!process.env[key]) {
      console.error(`Env ${key} belum diisi.`);
      process.exit(1);
    }
  }
  const bucket = process.env.MINIO_BUCKET!;
  const client = new Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL !== 'false',
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });

  const files = readdirSync(STORAGE_DIR)
    .filter((n) => /^(dc|wc|pe)-.*\.m4a$/.test(n))
    .sort();
  if (!files.length) {
    console.error(`Tidak ada dc-/wc-/pe-*.m4a di ${STORAGE_DIR} — jalankan dulu npm run seed:demo di Mac.`);
    process.exit(1);
  }

  let uploaded = 0;
  let skipped = 0;
  for (const name of files) {
    const exists = await client.statObject(bucket, name).then(
      () => true,
      () => false,
    );
    if (exists) {
      skipped++;
      continue;
    }
    await client.fPutObject(bucket, name, path.join(STORAGE_DIR, name), {
      'Content-Type': 'audio/mp4',
    });
    console.log(`↑ ${name}`);
    uploaded++;
  }
  console.log(`✔ ${uploaded} diunggah, ${skipped} sudah ada di bucket "${bucket}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
