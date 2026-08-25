import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('role guard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `user-role-test-${Date.now()}@ex.com`;
  const password = 'password123';

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.create({
      data: {
        name: 'User Role Test',
        email,
        role: 'USER',
        inviteStatus: 'ACCEPTED',
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('akun berperan USER login lalu akses route admin → 403', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const userToken = login.body.accessToken;
    expect(login.body.role).toBe('USER');

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
