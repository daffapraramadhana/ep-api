import { Global, Module, Type } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local.storage';
import { S3StorageService } from './s3.storage';

/**
 * Pure selection logic, extracted so it can be unit-tested without
 * bootstrapping the Nest DI container. Defaults to the local driver —
 * only STORAGE_DRIVER=s3 switches to the S3-compatible driver.
 */
export function storageProviderClass(): Type<StorageService> {
  return process.env.STORAGE_DRIVER === 's3'
    ? S3StorageService
    : LocalStorageService;
}

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      useClass: storageProviderClass(),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
