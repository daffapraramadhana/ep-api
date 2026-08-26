import { MinioStorageService } from './minio.storage';

/**
 * Unit test driver MinIO — client `minio` di-mock penuh (tidak ada koneksi
 * jaringan); yang diuji: komposisi URL publik, penolakan path traversal,
 * Content-Type per ekstensi, dan pemetaan kontrak StorageService ke
 * operasi client.
 */

const putObject = jest.fn().mockResolvedValue(undefined);
const statObject = jest.fn();
const listObjectsV2 = jest.fn();

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    putObject,
    statObject,
    listObjectsV2,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require('minio');

function makeService(env: Record<string, string> = {}, drop: string[] = []) {
  const defaults: Record<string, string> = {
    MINIO_ENDPOINT: 'bucket.example.com',
    MINIO_PORT: '9988',
    MINIO_USE_SSL: 'true',
    MINIO_ACCESS_KEY: 'ak',
    MINIO_SECRET_KEY: 'sk',
    MINIO_BUCKET: 'ep-app',
    MINIO_PUBLIC_BASE_URL: 'https://bucket.example.com:9988',
  };
  for (const [k, v] of Object.entries({ ...defaults, ...env })) {
    process.env[k] = v;
  }
  for (const k of drop) delete process.env[k];
  return new MinioStorageService();
}

describe('MinioStorageService', () => {
  const ORIGINAL = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL };
    jest.clearAllMocks();
  });

  it('membangun Client dari env MINIO_* (port number, ssl boolean)', () => {
    makeService();
    expect(Client).toHaveBeenCalledWith({
      endPoint: 'bucket.example.com',
      port: 9988,
      useSSL: true,
      accessKey: 'ak',
      secretKey: 'sk',
    });
  });

  it('MINIO_USE_SSL=false dan MINIO_PORT default 9000', () => {
    makeService({ MINIO_USE_SSL: 'false' }, ['MINIO_PORT']);
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({ port: 9000, useSSL: false }),
    );
  });

  it('servesLocally=false (media diambil via URL publik, bukan disk)', () => {
    expect(makeService().servesLocally).toBe(false);
  });

  it('getUrl: PUBLIC_BASE_URL/bucket/nama, trailing slash base dirapikan', () => {
    const svc = makeService({
      MINIO_PUBLIC_BASE_URL: 'https://bucket.example.com:9988/',
    });
    expect(svc.getUrl('dc-104-01.m4a')).toBe(
      'https://bucket.example.com:9988/ep-app/dc-104-01.m4a',
    );
  });

  it('put: menolak path traversal (hanya basename yang dipakai sebagai key)', async () => {
    await makeService().put('../../etc/passwd', Buffer.from('x'));
    expect(putObject).toHaveBeenCalledWith(
      'ep-app',
      'passwd',
      expect.any(Buffer),
      1,
      expect.any(Object),
    );
  });

  it('put: Content-Type sesuai ekstensi (m4a -> audio/mp4)', async () => {
    await makeService().put('wc-204-01.m4a', Buffer.from('abc'));
    expect(putObject).toHaveBeenCalledWith(
      'ep-app',
      'wc-204-01.m4a',
      expect.any(Buffer),
      3,
      { 'Content-Type': 'audio/mp4' },
    );
  });

  it('put: ekstensi tak dikenal -> application/octet-stream', async () => {
    await makeService().put('file.xyz', Buffer.from('a'));
    expect(putObject).toHaveBeenCalledWith(
      'ep-app',
      'file.xyz',
      expect.any(Buffer),
      1,
      { 'Content-Type': 'application/octet-stream' },
    );
  });

  it('exists: true bila statObject sukses, false bila melempar', async () => {
    statObject.mockResolvedValueOnce({ size: 10 });
    await expect(makeService().exists('a.mp3')).resolves.toBe(true);
    statObject.mockRejectedValueOnce(new Error('NotFound'));
    await expect(makeService().exists('b.mp3')).resolves.toBe(false);
  });

  it('stat: mengembalikan size dari statObject', async () => {
    statObject.mockResolvedValueOnce({ size: 1234 });
    await expect(makeService().stat('a.mp3')).resolves.toEqual({ size: 1234 });
  });

  it('listNames: mengalirkan nama objek dari stream listObjectsV2', async () => {
    const handlers: Record<string, (arg?: unknown) => void> = {};
    listObjectsV2.mockReturnValueOnce({
      on(event: string, cb: (arg?: unknown) => void) {
        handlers[event] = cb;
        return this;
      },
    });
    const promise = makeService().listNames();
    handlers.data({ name: 'a.m4a' });
    handlers.data({ name: 'b.wav' });
    handlers.end();
    await expect(promise).resolves.toEqual(['a.m4a', 'b.wav']);
  });
});
