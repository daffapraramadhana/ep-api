// apps/api/src/tts/cli/prefetch-model.ts
// Dipanggil saat `docker build`: unduh model Kokoro ke TTS_MODEL_DIR supaya
// runtime tak butuh internet dan request pertama tak menunggu unduhan.
import { KokoroEngine } from '../tts-engine';

async function main() {
  const engine = new KokoroEngine();
  const audio = await engine.synthesize({ voice: 'af_heart', text: 'Hello.' });
  await engine.unload();
  console.log(
    `✔ Model Kokoro siap di ${process.env.TTS_MODEL_DIR ?? '(cache bawaan)'} — ${audio.sampleRate} Hz.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
