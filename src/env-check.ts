/**
 * Fail fast on missing required config instead of booting into a broken
 * state — e.g. CORS silently failing open with origin=undefined, or the
 * S3 driver throwing obscure SDK errors on the first upload because a
 * credential env var was never set.
 *
 * Kept in its own module (rather than inline in main.ts) so it can be
 * unit-tested without triggering main.ts's top-level bootstrap() call.
 */
export function assertRequiredEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'WEB_ORIGIN'];
  if (process.env.STORAGE_DRIVER === 's3') {
    required.push(
      'S3_ENDPOINT',
      'S3_BUCKET',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_PUBLIC_URL',
    );
  }
  if (process.env.STORAGE_DRIVER === 'minio') {
    // MINIO_PORT opsional (default 9000) — sisanya wajib.
    required.push(
      'MINIO_ENDPOINT',
      'MINIO_BUCKET',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_PUBLIC_BASE_URL',
    );
  }
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(
      `Konfigurasi env wajib tidak ditemukan: ${missing.join(', ')}. ` +
        'Periksa .env (lokal) atau .env.prod (produksi) — lihat README untuk daftar lengkap.',
    );
    process.exit(1);
  }
}
