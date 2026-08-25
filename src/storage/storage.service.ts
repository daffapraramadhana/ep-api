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
}
