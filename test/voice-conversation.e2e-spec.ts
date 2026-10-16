import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ELEVENLABS_CLIENT } from '../src/voice-conversation/elevenlabs-client.service';
import {
  addDays,
  startOfDayWIBInstant,
  startOfWeekWIBInstant,
} from '../src/common/wib';

// Talking agent (ElevenLabs Conversational AI): BE tidak pernah di jalur
// panggilan — mint signed URL (POST /voice-conversation/start), terima webhook
// post-call (POST /voice-conversation/webhook/elevenlabs, publik + HMAC),
// client polling status. Semua diuji dgn fake ELEVENLABS_CLIENT (tidak pernah
// menyentuh API ElevenLabs asli). Prefix `vc-`/`VC-` milik sendiri.
const PASSWORD = 'Password123!';
const TEST_SECRET = 'e2e-webhook-secret';
const TEST_AGENT = 'e2e-agent-id';
const FAKE_SIGNED_URL = 'wss://fake.elevenlabs.signed';
// Registry detail percakapan untuk fake getConversation — reconcile fallback
// butuh jawaban deterministik per id ElevenLabs.
const fakeConversations = new Map<string, object>();

/** Ubah payload webhook (wrapper {data}) jadi respons detail top-level ElevenLabs. */
const detailFromWebhook = (payload: object) => {
  const data = (payload as { data: object }).data;
  return { ...data, status: 'done' };
};

describe('Voice Conversation (talking agent)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();

  let noConsentToken: string;
  let happyUserToken: string;
  let happyUserId: string;
  let capDailyToken: string;
  let capWeeklyToken: string;
  let graderUserId: string;
  let graderToken: string;
  let otherUserId: string;
  let otherToken: string;
  let reconToken: string;
  let reconUserId: string;

  function sign(payload: object): string {
    return createHmac('sha256', TEST_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async function makeUser(name: string, email: string, voiceConsent = true) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
        voiceConsentAt: voiceConsent ? new Date() : null,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return { id: user.id, token: login.body.accessToken as string };
  }

  const webhookPayload = (conversationId: string, userId: string) => ({
    data: {
      conversation_id: `el-${conversationId}`,
      transcript: [
        { role: 'agent', message: 'Hi! Let us practice English.', time_in_call_secs: 2 },
        { role: 'user', message: 'hello there', time_in_call_secs: 4 },
        { role: 'agent', message: 'Great. What did you do today?', time_in_call_secs: 6 },
        { role: 'user', message: 'I went to the office', time_in_call_secs: 9 },
        { role: 'agent', message: 'Nice. Any plans tonight?', time_in_call_secs: 12 },
        { role: 'user', message: 'I will cook dinner', time_in_call_secs: 15 },
        { role: 'agent', message: 'And tomorrow morning?', time_in_call_secs: 18 },
        { role: 'user', message: 'I will wake up early', time_in_call_secs: 21 },
        { role: 'agent', message: 'Sounds good, bye!', time_in_call_secs: 24 },
      ],
      metadata: { call_duration_secs: 75, cost: 0.1 },
      conversation_initiation_client_data: {
        dynamic_variables: { fluen_conversation_id: conversationId, fluen_user_id: userId },
      },
    },
  });

  beforeAll(async () => {
    process.env.ELEVENLABS_WEBHOOK_SECRET = TEST_SECRET;
    process.env.ELEVENLABS_AGENT_ID = TEST_AGENT;
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ELEVENLABS_CLIENT)
      .useValue({
        getSignedUrl: async () => FAKE_SIGNED_URL,
        getConversation: async (id: string) => fakeConversations.get(id) ?? null,
      })
      .compile();
    app = m.createNestApplication({ rawBody: true });
    await app.init();
    prisma = app.get(PrismaService);
    // Feature flag VOICE_AGENT_ENABLED nyala selama suite ini (restore '0'
    // di afterAll). Config dibaca saat start() pertama, bukan saat boot,
    // jadi pengaturan setelah app.init() aman. Spec lain tidak baca key ini.
    await prisma.config.upsert({
      where: { key: 'VOICE_AGENT_ENABLED' },
      update: { value: '1' },
      create: { key: 'VOICE_AGENT_ENABLED', value: '1' },
    });

    noConsentToken = (await makeUser('VC No Consent', `vc-noc-${stamp}@x.id`, false)).token;
    const happy = await makeUser('VC Happy', `vc-hap-${stamp}@x.id`);
    happyUserToken = happy.token;
    happyUserId = happy.id;
    capDailyToken = (await makeUser('VC CapDay', `vc-capd-${stamp}@x.id`)).token;
    capWeeklyToken = (await makeUser('VC CapWeek', `vc-capw-${stamp}@x.id`)).token;
    const grader = await makeUser('VC Grader', `vc-gra-${stamp}@x.id`);
    graderToken = grader.token;
    graderUserId = grader.id;
    const other = await makeUser('VC Other', `vc-oth-${stamp}@x.id`);
    otherToken = other.token;
    otherUserId = other.id;
    const recon = await makeUser('VC Recon', `vc-rec-${stamp}@x.id`);
    reconToken = recon.token;
    reconUserId = recon.id;
  });

  afterAll(async () => {
    delete process.env.ELEVENLABS_WEBHOOK_SECRET;
    delete process.env.ELEVENLABS_AGENT_ID;
    await prisma.config.upsert({
      where: { key: 'VOICE_AGENT_ENABLED' },
      update: { value: '0' },
      create: { key: 'VOICE_AGENT_ENABLED', value: '0' },
    });
    await prisma.voiceConversation.deleteMany({
      where: { user: { email: { startsWith: 'vc-' } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'vc-' } } });
    await app.close();
  });

  describe('POST /voice-conversation/start', () => {
    it('menolak tanpa consent rekaman (UU PDP)', async () => {
      await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${noConsentToken}`)
        .expect(403);
    });

    it('menolak tanpa token', async () => {
      await request(app.getHttpServer()).post('/voice-conversation/start').expect(401);
    });

    it('membuat row PENDING + mengembalikan signed URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${happyUserToken}`)
        .expect(201);
      expect(res.body.signedUrl).toBe(FAKE_SIGNED_URL);
      const recordId: string = res.body.conversationRecordId;
      expect(recordId).toBeTruthy();
      expect(res.body.dynamicVariables).toEqual({
        fluen_conversation_id: recordId,
        fluen_user_id: happyUserId,
      });

      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.status).toBe('PENDING');
      expect(row?.userId).toBe(happyUserId);
    });

    it('429 saat cap harian tercapai', async () => {
      const capdUser = await prisma.user.findUnique({
        where: { email: `vc-capd-${stamp}@x.id` },
      });
      // 00:01 WIB hari ini — slot 00:00–07:00 WIB dulu lolos dari cap karena
      // batas hari dibandingkan sbg penanda tanggal (00:00 UTC), bukan instan.
      const MIN = 60_000;
      await prisma.voiceConversation.create({
        data: {
          userId: capdUser!.id,
          createdAt: new Date(startOfDayWIBInstant(new Date()).getTime() + MIN),
        },
      });
      await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${capDailyToken}`)
        .expect(429);
    });

    it('429 saat cap mingguan tercapai walau hari ini kosong', async () => {
      const weekUser = await prisma.user.findUnique({
        where: { email: `vc-capw-${stamp}@x.id` },
      });
      const today = startOfDayWIBInstant(new Date());
      const wkStart = startOfWeekWIBInstant(new Date());
      // 4 row di minggu ini (00:01 WIB, slot rawan) tapi tidak ada yg hari ini
      // → daily (1) aman, weekly (4) tercapai. Hari-hari setelah hari ini
      // (masa depan) tetap di minggu ini, jadi tidak bocor ke cap harian.
      const MIN = 60_000;
      const candidates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(wkStart, i);
        if (d.getTime() !== today.getTime())
          candidates.push(new Date(d.getTime() + MIN));
      }
      await prisma.voiceConversation.createMany({
        data: candidates.slice(0, 4).map((createdAt) => ({
          userId: weekUser!.id,
          createdAt,
        })),
      });
      await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${capWeeklyToken}`)
        .expect(429);
    });
  });

  describe('GET /voice-conversation/:id (status)', () => {
    it('mengembalikan 404 untuk id tak dikenal', async () => {
      await request(app.getHttpServer())
        .get(`/voice-conversation/cxk-${stamp}-nonexistent`)
        .set('Authorization', `Bearer ${happyUserToken}`)
        .expect(404);
    });

    it('mengembalikan 404 untuk row milik user lain (ownership check)', async () => {
      const happyUser = await prisma.user.findUnique({
        where: { email: `vc-hap-${stamp}@x.id` },
      });
      const row = await prisma.voiceConversation.findFirst({
        where: { userId: happyUser!.id },
      });
      await request(app.getHttpServer())
        .get(`/voice-conversation/${row!.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });

  describe('POST /voice-conversation/webhook/elevenlabs (publik, HMAC)', () => {
    let recordId: string;
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${graderToken}`)
        .expect(201);
      recordId = res.body.conversationRecordId;
    });

    it('menolak tanpa signature (401)', async () => {
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .send(webhookPayload(recordId, graderUserId))
        .expect(401);
    });

    it('menolak signature salah (401)', async () => {
      const bad = createHmac('sha256', 'salah').update('{}').digest('hex');
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', bad)
        .send(webhookPayload(recordId, graderUserId))
        .expect(401);
    });

    it('menggradasi call yang layak → GRADED, passed, XP', async () => {
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', sign(webhookPayload(recordId, graderUserId)))
        .send(webhookPayload(recordId, graderUserId))
        .expect(200);

      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.status).toBe('GRADED');
      expect(row?.passed).toBe(true);
      expect(row?.xpAwarded).toBe(40); // XP_VOICE_CONVERSATION dari seed
      expect(row?.userTurnCount).toBe(4);
      expect(row?.durationSecs).toBe(75);
      expect(row?.gradedAt).not.toBeNull();

      // status endpoint untuk client: GRADED, transcript tidak ikut
      const status = await request(app.getHttpServer())
        .get(`/voice-conversation/${recordId}`)
        .set('Authorization', `Bearer ${graderToken}`)
        .expect(200);
      expect(status.body.status).toBe('GRADED');
      expect(status.body.passed).toBe(true);
      expect(status.body.xpAwarded).toBe(40);
      expect(status.body.transcript).toBeUndefined();
    });

    it('retry webhook idempoten (tidak menambah XP dua kali)', async () => {
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', sign(webhookPayload(recordId, graderUserId)))
        .send(webhookPayload(recordId, graderUserId))
        .expect(200);
      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.xpAwarded).toBe(40);
    });

    it('call yang gagal syarat (durasi pendek) → GRADED tapi tidak lolos', async () => {
      const res = await request(app.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(201);
      const shortId = res.body.conversationRecordId;
      const short = webhookPayload(shortId, otherUserId);
      short.data!.metadata!.call_duration_secs = 10; // < VOICE_MIN_DURATION_SECS
      short.data!.metadata!.cost = 0.02;
      short.data!.transcript = short.data!.transcript!.slice(0, 1); // 1 giliran user

      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', sign(short))
        .send(short)
        .expect(200);

      const row = await prisma.voiceConversation.findUnique({ where: { id: shortId } });
      expect(row?.status).toBe('GRADED');
      expect(row?.passed).toBe(false);
      expect(row?.xpAwarded).toBe(0);
    });

    it('webhook utk row tak dikenal → 200 (no retry-storm)', async () => {
      const ghost = webhookPayload(`cxk-${stamp}-ghost`, graderUserId);
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', sign(ghost))
        .send(ghost)
        .expect(200);
    });

    it('webhook dgn user mismatch → 200 tanpa XP', async () => {
      const mismatch = webhookPayload(recordId, otherUserId); // row milik grader
      await request(app.getHttpServer())
        .post('/voice-conversation/webhook/elevenlabs')
        .set('elevenlabs-signature', sign(mismatch))
        .send(mismatch)
        .expect(200);
      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.xpAwarded).toBe(40);
    });
  });

  // Fallback reconcile — jalur grading kedua bila webhook tak sampai: browser
  // daftarkan id ElevenLabs (POST :id/register), poll status tarik detail
  // & grade sendiri. Row dibuat via prisma (menghindari cap harian).
  describe('register + reconcile fallback (tanpa webhook)', () => {
    async function newPendingRow(): Promise<string> {
      const row = await prisma.voiceConversation.create({
        data: { userId: reconUserId },
      });
      return row.id;
    }

    it('register valid menyimpan id ElevenLabs ke row', async () => {
      const recordId = await newPendingRow();
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({ conversationId: `el-${recordId}` })
        .expect(201);
      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.elevenlabsConversationId).toBe(`el-${recordId}`);
    });

    it('register id beda utk row sama → 409', async () => {
      const recordId = await newPendingRow();
      await prisma.voiceConversation.update({
        where: { id: recordId },
        data: { elevenlabsConversationId: `el-${recordId}-a` },
      });
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({ conversationId: `el-${recordId}-b` })
        .expect(409);
    });

    it('register utk row milik user lain → 404 (ownership)', async () => {
      const recordId = await newPendingRow();
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ conversationId: `el-${recordId}` })
        .expect(404);
    });

    it('register tanpa conversationId → 400', async () => {
      const recordId = await newPendingRow();
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({})
        .expect(400);
    });

    it('status poll menggradasi row PENDING via reconcile (data dari ElevenLabs)', async () => {
      const recordId = await newPendingRow();
      const elId = `el-${recordId}`;
      // Skenario webhook tidak pernah datang: hanya data ElevenLabs tersedia.
      fakeConversations.set(
        elId,
        detailFromWebhook(webhookPayload(recordId, reconUserId)),
      );
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({ conversationId: elId })
        .expect(201);

      const status = await request(app.getHttpServer())
        .get(`/voice-conversation/${recordId}`)
        .set('Authorization', `Bearer ${reconToken}`)
        .expect(200);
      expect(status.body.status).toBe('GRADED');
      expect(status.body.passed).toBe(true);
      expect(status.body.xpAwarded).toBe(40);
      expect(status.body.durationSecs).toBe(75);

      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.status).toBe('GRADED');
      expect(row?.elevenlabsConversationId).toBe(elId);
      expect(row?.gradedAt).not.toBeNull();
    });

    it('detail belum terminal (status running) → row tetap PENDING', async () => {
      const recordId = await newPendingRow();
      const elId = `el-${recordId}`;
      fakeConversations.set(elId, { status: 'running' });
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({ conversationId: elId })
        .expect(201);

      const status = await request(app.getHttpServer())
        .get(`/voice-conversation/${recordId}`)
        .set('Authorization', `Bearer ${reconToken}`)
        .expect(200);
      expect(status.body.status).toBe('PENDING');

      const row = await prisma.voiceConversation.findUnique({ where: { id: recordId } });
      expect(row?.status).toBe('PENDING');
      // Reconcile tak menggradasi, hanya menandai waktu percobaan (cooldown 10s
      // membuat poll berikutnya tak memukul ElevenLabs berulang kali).
    });

    it('id ElevenLabs tak dikenal → row tetap PENDING (bukan error)', async () => {
      const recordId = await newPendingRow();
      await request(app.getHttpServer())
        .post(`/voice-conversation/${recordId}/register`)
        .set('Authorization', `Bearer ${reconToken}`)
        .send({ conversationId: `el-${recordId}-ghost` })
        .expect(201);
      const status = await request(app.getHttpServer())
        .get(`/voice-conversation/${recordId}`)
        .set('Authorization', `Bearer ${reconToken}`)
        .expect(200);
      expect(status.body.status).toBe('PENDING');
    });
  });

  // Gate diuji dgn instance app SEGAR (cache config kosong) — instance utama
  // sudah meng-cache VOICE_AGENT_ENABLED='1' (60 dtk) dari test start() di
  // atas, jadi mematikan flag di DB tidak terlihat olehnya.
  describe('feature flag VOICE_AGENT_ENABLED off', () => {
    let offApp: INestApplication;
    let offToken: string;
    beforeAll(async () => {
      const offUser = await makeUser('VC Off', `vc-off-${stamp}@x.id`);
      offToken = offUser.token;
      await prisma.config.upsert({
        where: { key: 'VOICE_AGENT_ENABLED' },
        update: { value: '0' },
        create: { key: 'VOICE_AGENT_ENABLED', value: '0' },
      });
      const m = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ELEVENLABS_CLIENT)
        .useValue({
          getSignedUrl: async () => FAKE_SIGNED_URL,
          getConversation: async (id: string) => fakeConversations.get(id) ?? null,
        })
        .compile();
      offApp = m.createNestApplication();
      await offApp.init();
    });

    afterAll(async () => {
      await offApp.close();
    });

    it('start ditolak 404 saat flag off', async () => {
      await request(offApp.getHttpServer())
        .post('/voice-conversation/start')
        .set('Authorization', `Bearer ${offToken}`)
        .expect(404);
    });
  });
});
