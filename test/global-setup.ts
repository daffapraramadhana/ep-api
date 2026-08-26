import { retireDemoContent } from './demo-content-guard';

export default async function globalSetup() {
  await retireDemoContent();
}
