import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('users import', () => {
  let app: INestApplication;
  let adminToken: string;
  const createdEmails: string[] = [];

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
    const prisma = app.get(PrismaService);
    if (createdEmails.length) {
      await prisma.attempt.deleteMany({ where: { user: { email: { in: createdEmails } } } });
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await app.close();
  });

  const csv = 'nama,email\nBudi,budi-X@ex.com\nSiti,siti-X@ex.com\nBudi Lagi,budi-X@ex.com\n,kosong@ex.com'
    .replaceAll('X', Date.now().toString());
  createdEmails.push(
    `budi-${csv.match(/budi-(\d+)@/)?.[1]}@ex.com`,
    `siti-${csv.match(/siti-(\d+)@/)?.[1]}@ex.com`,
  );

  it('import karyawan: buat akun, laporkan duplikat & baris invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'karyawan.csv')
      .expect(201);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toBe(2); // duplikat dalam file + nama kosong
    expect(res.body.errors).toHaveLength(2);
    expect(res.body.invites).toHaveLength(2);
    expect(res.body.invites[0].inviteUrl).toContain('/invite/');
    expect(res.body.invites[0].inviteUrl).toBe(
      `${process.env.WEB_ORIGIN}/invite/${res.body.invites[0].inviteUrl.split('/invite/')[1]}`,
    );
  });

  it('tanpa token admin → 401', () =>
    request(app.getHttpServer()).post('/admin/users/import').expect(401));

  it('GET /admin/users → daftar user dengan shape yang benar', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((u: { email: string }) =>
      createdEmails.includes(u.email),
    );
    expect(found).toBeDefined();
    expect(found).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        inviteStatus: expect.any(String),
        createdAt: expect.any(String),
      }),
    );
  });

  it('GET /admin/users tanpa token → 401', () =>
    request(app.getHttpServer()).get('/admin/users').expect(401));
});
