import { GroqSttService } from './groq-stt.service';

describe('GroqSttService', () => {
  const service = new GroqSttService();
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  });

  it('mengirim multipart ke endpoint Groq dan mengembalikan text', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'the quick brown fox' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const text = await service.transcribe(Buffer.from('x'), 'audio/webm');

    expect(text).toBe('the quick brown fox');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('text kosong → string kosong, bukan throw', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    await expect(
      service.transcribe(Buffer.from('x'), 'audio/mp4'),
    ).resolves.toBe('');
  });

  it('respon non-ok → throw', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }) as unknown as typeof fetch;
    await expect(
      service.transcribe(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/429/);
  });

  it('GROQ_API_KEY kosong → throw jelas', async () => {
    delete process.env.GROQ_API_KEY;
    await expect(
      service.transcribe(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/GROQ_API_KEY/);
  });
});
