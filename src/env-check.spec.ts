import { assertRequiredEnv } from './env-check';

describe('assertRequiredEnv', () => {
  const ORIGINAL = { ...process.env };
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL };
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does not exit when DATABASE_URL/JWT_SECRET/WEB_ORIGIN are all set and driver is local', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.JWT_SECRET = 'secret';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.STORAGE_DRIVER = 'local';

    assertRequiredEnv();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits with a clear message listing missing base vars', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.STORAGE_DRIVER = 'local';

    assertRequiredEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('DATABASE_URL'),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET'));
  });

  it('additionally requires S3_* vars when STORAGE_DRIVER=s3', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.JWT_SECRET = 'secret';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.STORAGE_DRIVER = 's3';
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;
    delete process.env.S3_PUBLIC_URL;

    assertRequiredEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('S3_ENDPOINT'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('S3_BUCKET'));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('S3_ACCESS_KEY'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('S3_SECRET_KEY'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('S3_PUBLIC_URL'),
    );
  });

  it('additionally requires MINIO_* vars when STORAGE_DRIVER=minio', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.JWT_SECRET = 'secret';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.STORAGE_DRIVER = 'minio';
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_BUCKET;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_PUBLIC_BASE_URL;

    assertRequiredEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    for (const key of [
      'MINIO_ENDPOINT',
      'MINIO_BUCKET',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_PUBLIC_BASE_URL',
    ]) {
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(key));
    }
  });

  it('MINIO_PORT is optional for STORAGE_DRIVER=minio', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.JWT_SECRET = 'secret';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.STORAGE_DRIVER = 'minio';
    process.env.MINIO_ENDPOINT = 'bucket.example.com';
    process.env.MINIO_BUCKET = 'ep-app';
    process.env.MINIO_ACCESS_KEY = 'ak';
    process.env.MINIO_SECRET_KEY = 'sk';
    process.env.MINIO_PUBLIC_BASE_URL = 'https://bucket.example.com:9988';
    delete process.env.MINIO_PORT;

    assertRequiredEnv();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('does not require S3_* vars when STORAGE_DRIVER is unset/local', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.JWT_SECRET = 'secret';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    delete process.env.STORAGE_DRIVER;
    delete process.env.S3_ENDPOINT;

    assertRequiredEnv();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
