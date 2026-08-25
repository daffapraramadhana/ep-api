import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('auth', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('login benar → token + role', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.role).toBe('ADMIN');
  });
  it('password salah → 401', () =>
    request(app.getHttpServer()).post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: 'salah' }).expect(401));
});
