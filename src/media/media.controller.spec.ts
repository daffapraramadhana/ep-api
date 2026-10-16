import { MediaController } from './media.controller';
import { StorageService } from '../storage/storage.service';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    sendFile: jest.fn().mockReturnThis(),
  } as any;
}

describe('MediaController#serve (driver branching)', () => {
  it('redirects (302) to storage.getUrl() when the active driver does not serve locally (S3)', async () => {
    const storage: Partial<StorageService> = {
      exists: jest.fn().mockResolvedValue(true),
      servesLocally: false,
      getUrl: jest.fn().mockReturnValue('https://cdn.example.com/foo.mp3'),
    };
    const controller = new MediaController(storage as StorageService);
    const res = mockRes();

    await controller.serve('foo.mp3', res);

    expect(storage.getUrl).toHaveBeenCalledWith('foo.mp3');
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://cdn.example.com/foo.mp3',
    );
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('sendFiles from local disk when the active driver serves locally', async () => {
    const storage: Partial<StorageService> = {
      exists: jest.fn().mockResolvedValue(true),
      servesLocally: true,
      getUrl: jest.fn(),
    };
    const controller = new MediaController(storage as StorageService);
    const res = mockRes();

    await controller.serve('foo.mp3', res);

    expect(res.sendFile).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('404s without touching the driver-specific branch when the file does not exist', async () => {
    const storage: Partial<StorageService> = {
      exists: jest.fn().mockResolvedValue(false),
      servesLocally: false,
      getUrl: jest.fn(),
    };
    const controller = new MediaController(storage as StorageService);
    const res = mockRes();

    await controller.serve('missing.mp3', res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.sendFile).not.toHaveBeenCalled();
  });
});

describe('MediaController#list', () => {
  it('menyembunyikan klip TTS (tts-*.mp3) dari pustaka media admin', async () => {
    const storage: Partial<StorageService> = {
      listNames: jest
        .fn()
        .mockResolvedValue([
          'audio_001.mp3',
          'tts-0123456789abcdef0123456789abcdef.mp3',
        ]),
      stat: jest.fn().mockResolvedValue({ size: 10 }),
    };
    const controller = new MediaController(storage as StorageService);
    expect(await controller.list()).toEqual([
      { name: 'audio_001.mp3', size: 10 },
    ]);
    expect(storage.stat).toHaveBeenCalledTimes(1);
  });
});
