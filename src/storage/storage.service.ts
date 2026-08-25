/**
 * Abstract storage driver contract. Used purely as a DI token —
 * NestJS providers bind a concrete implementation (LocalStorageService
 * or S3StorageService) to this class at module-registration time, so
 * consumers can keep injecting `StorageService` without knowing which
 * driver is active.
 */
export abstract class StorageService {
  abstract put(name: string, buf: Buffer): Promise<void>;
  abstract exists(name: string): Promise<boolean>;
  abstract listNames(): Promise<string[]>;
  abstract stat(name: string): Promise<{ size: number }>;
  abstract getUrl(name: string): string;
  /**
   * Whether files can be handed out straight from local disk (true, e.g.
   * LocalStorageService), or must be reached through getUrl() instead
   * (false — e.g. S3StorageService, where the driver never has the bytes
   * on this machine). MediaController#serve branches on this instead of
   * always reading off local disk, which would silently 404/serve garbage
   * once STORAGE_DRIVER=s3.
   */
  abstract readonly servesLocally: boolean;
}
