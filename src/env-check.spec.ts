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
