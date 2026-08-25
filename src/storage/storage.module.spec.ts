import { storageProviderClass } from './storage.module';
import { LocalStorageService } from './local.storage';
import { S3StorageService } from './s3.storage';

describe('storageProviderClass (STORAGE_DRIVER selection)', () => {
  const original = process.env.STORAGE_DRIVER;

  afterEach(() => {
    if (original === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = original;
  });

  it('defaults to LocalStorageService when STORAGE_DRIVER is unset', () => {
    delete process.env.STORAGE_DRIVER;
    expect(storageProviderClass()).toBe(LocalStorageService);
  });

  it('selects S3StorageService when STORAGE_DRIVER=s3', () => {
    process.env.STORAGE_DRIVER = 's3';
    expect(storageProviderClass()).toBe(S3StorageService);
  });

  it('falls back to LocalStorageService for any other value', () => {
    process.env.STORAGE_DRIVER = 'weird-value';
    expect(storageProviderClass()).toBe(LocalStorageService);
  });
});
