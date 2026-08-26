import { restoreDemoContent } from './demo-content-guard';

export default async function globalTeardown() {
  await restoreDemoContent();
}
