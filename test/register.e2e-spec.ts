import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('register (registrasi mandiri)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];

  const freshEmail = () => {
    const e = `reg-${randomUUID()}@example.com`;
    emails.push(e);
    return e;
  };

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  const adminToken = async () => {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    return res.body.accessToken as string;
  };

  it('register valid → akun AWAITING_APPROVAL, tanpa token', async () => {
    const email = freshEmail();
    const res = await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email, password: 'rahasia123' }).expect(201);
    expect(res.body.accessToken).toBeUndefined();

    const u = await prisma.user.findUnique({ where: { email } });
    expect(u?.inviteStatus).toBe('AWAITING_APPROVAL');
    expect(u?.role).toBe('USER');
    expect(u?.passwordHash).toBeTruthy();
  });

  it('email sudah terdaftar → 400', async () => {
    const email = freshEmail();
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email, password: 'rahasia123' }).expect(201);
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Lain', email, password: 'rahasia123' }).expect(400);
  });

  it('input tidak valid → 400 (nama kosong / email salah / password pendek)', async () => {
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: '', email: freshEmail(), password: 'rahasia123' }).expect(400);
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email: 'bukan-email', password: 'rahasia123' }).expect(400);
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email: freshEmail(), password: 'pendek' }).expect(400);
  });

  it('login sebelum disetujui → 403; setelah admin setujui → 201 + token', async () => {
    const email = freshEmail();
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email, password: 'rahasia123' }).expect(201);

    await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'rahasia123' }).expect(403);

    const u = await prisma.user.findUnique({ where: { email } });
    await request(app.getHttpServer())
      .patch(`/admin/users/${u!.id}/approve`)
      .set('Authorization', `Bearer ${await adminToken()}`)
      .expect(200);

    const ok = await request(app.getHttpServer()).post('/auth/login')
      .send({ email, password: 'rahasia123' }).expect(201);
    expect(ok.body.accessToken).toBeDefined();
    expect(ok.body.role).toBe('USER');
  });

  it('approve tanpa token admin → 401', async () => {
    const email = freshEmail();
    await request(app.getHttpServer()).post('/auth/register')
      .send({ name: 'Sari', email, password: 'rahasia123' }).expect(201);
    const u = await prisma.user.findUnique({ where: { email } });
    await request(app.getHttpServer())
      .patch(`/admin/users/${u!.id}/approve`).expect(401);
  });

  it('login user undangan lama (ACCEPTED) tetap jalan', async () => {
    // regresi: gerbang approval tidak boleh menutup user existing
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
  });
});
