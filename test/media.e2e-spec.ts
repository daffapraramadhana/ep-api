import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('media', () => {
  let app: INestApplication;
  let adminToken: string;
  const storageDir = process.env.STORAGE_DIR ?? './storage';
  const createdFiles = ['audio_test_001.mp3'];

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(201);
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    for (const name of createdFiles) {
      await fs.rm(path.join(storageDir, name), { force: true });
    }
    await app.close();
  });

  it('upload lalu list', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/media')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('files', Buffer.from('fake-mp3'), 'audio_test_001.mp3')
      .attach('files', Buffer.from('fake-exe'), 'virus.exe')
      .expect(201);
    expect(res.body.saved).toContain('audio_test_001.mp3');
    expect(res.body.rejected[0]).toMatchObject({ name: 'virus.exe' });

    const list = await request(app.getHttpServer())
      .get('/admin/media')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.map((f: any) => f.name)).toContain('audio_test_001.mp3');
  });

  it('upload nama yang sudah ada → 409 di laporan (bukan HTTP 409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/media')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('files', Buffer.from('fake-mp3-again'), 'audio_test_001.mp3')
      .expect(201);
    expect(res.body.saved).not.toContain('audio_test_001.mp3');
    expect(res.body.rejected[0]).toMatchObject({ name: 'audio_test_001.mp3' });
  });

  it('tanpa token admin → 401 (upload)', () =>
    request(app.getHttpServer()).post('/admin/media').expect(401));

  it('tanpa token admin → 401 (list)', () =>
    request(app.getHttpServer()).get('/admin/media').expect(401));

  it('GET /media/:name menyajikan file yang ada', async () => {
    await request(app.getHttpServer())
      .get('/media/audio_test_001.mp3')
      .expect(200);
  });

  it('GET /media/:name 404 untuk file yang tidak ada', async () => {
    await request(app.getHttpServer())
      .get('/media/tidak-ada.mp3')
      .expect(404);
  });

  it('GET /media/:name menolak path traversal', async () => {
    await request(app.getHttpServer())
      .get('/media/..%2F..%2Fpackage.json')
      .expect(404);
  });
});
