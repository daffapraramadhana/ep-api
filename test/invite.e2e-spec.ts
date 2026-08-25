import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('invite', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('alur undangan lengkap', async () => {
    const prisma = app.get(PrismaService);
    const token = randomUUID();
    const email = `t-${token}@example.com`;
    await prisma.user.create({ data: { name: 'Budi', email, inviteToken: token } });

    const info = await request(app.getHttpServer()).get(`/auth/invite/${token}`).expect(200);
    expect(info.body.email).toBe(email);
    expect(info.body.name).toBe('Budi');

    await request(app.getHttpServer()).post('/auth/accept-invite')
      .send({ token, password: 'pendek' }).expect(400);

    const ok = await request(app.getHttpServer()).post('/auth/accept-invite')
      .send({ token, password: 'rahasia123' }).expect(201);
    expect(ok.body.accessToken).toBeDefined();
    expect(ok.body.role).toBe('USER');
    expect(ok.body.name).toBe('Budi');

    // token sekali pakai
    await request(app.getHttpServer()).get(`/auth/invite/${token}`).expect(404);
    await request(app.getHttpServer()).post('/auth/accept-invite')
      .send({ token, password: 'rahasia123' }).expect(404);

    await prisma.attempt.deleteMany({ where: { user: { email } } });
    await prisma.user.delete({ where: { email } });
  });

  it('token tidak ada → 404', () =>
    request(app.getHttpServer()).get(`/auth/invite/${randomUUID()}`).expect(404));
});
