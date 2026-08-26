import { Global, Module, Type } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local.storage';
import { S3StorageService } from './s3.storage';
import { MinioStorageService } from './minio.storage';

/**
 * Pure selection logic, extracted so it can be unit-tested without
 * bootstrapping the Nest DI container. Defaults to the local driver —
 * STORAGE_DRIVER=s3 switches to the S3-compatible driver, =minio to the
 * internal-MinIO driver (env MINIO_*).
 */
export function storageProviderClass(): Type<StorageService> {
  switch (process.env.STORAGE_DRIVER) {
    case 's3':
      return S3StorageService;
    case 'minio':
      return MinioStorageService;
    default:
      return LocalStorageService;
  }
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
