import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { requestLogging } from '../src/logger/request-logging.middleware';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'password123';
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(requestLogging);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns hello', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({ message: 'Hello World!' });
  });

  it('GET /health-check returns up', () => {
    return request(app.getHttpServer()).get('/health-check').expect(200).expect({ message: 'up' });
  });

  it('echoes a request id on every response', async () => {
    const res = await request(app.getHttpServer()).get('/').set('x-request-id', 'e2e-req-1').expect(200);
    expect(res.headers['x-request-id']).toBe('e2e-req-1');
  });

  it('GET /health/live reports ok', () => {
    return request(app.getHttpServer()).get('/health/live').expect(200).expect({ status: 'ok' });
  });

  it('GET /health/ready checks the database', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect((res.body as { info: { database: { status: string } } }).info.database.status).toBe('up');
  });

  it('POST /auth/register creates a user', () => {
    return request(app.getHttpServer()).post('/auth/register').send({ email, name: 'E2E', password }).expect(201);
  });

  it('POST /auth/register rejects a duplicate email', () => {
    return request(app.getHttpServer()).post('/auth/register').send({ email, name: 'E2E', password }).expect(409);
  });

  it('POST /auth/register rejects an invalid body', () => {
    return request(app.getHttpServer()).post('/auth/register').send({ email: 'not-an-email', password: 'x' }).expect(400);
  });

  it('POST /auth/login returns a token', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    const body = res.body as { access_token: string };
    expect(body.access_token).toEqual(expect.any(String));
    token = body.access_token;
  });

  it('POST /auth/login rejects a wrong password', () => {
    return request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
  });

  it('GET /tasks requires a token', () => {
    return request(app.getHttpServer()).get('/tasks').expect(401);
  });

  it('creates, reads, updates and deletes a task', async () => {
    const server = app.getHttpServer();
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(server).post('/tasks').set(auth).send({ title: 'e2e task' }).expect(201);
    const id = (created.body as { id: number }).id;

    await request(server).get(`/tasks/${id}`).set(auth).expect(200);
    await request(server).patch(`/tasks/${id}`).set(auth).send({ status: 'done' }).expect(200);
    await request(server).delete(`/tasks/${id}`).set(auth).expect(204);
    await request(server).get(`/tasks/${id}`).set(auth).expect(404);
  });

  it('logs in with a differently cased email', () => {
    return request(app.getHttpServer()).post('/auth/login').send({ email: email.toUpperCase(), password }).expect(200);
  });

  it("does not expose one user's tasks to another user", async () => {
    const server = app.getHttpServer();
    const owner = { Authorization: `Bearer ${token}` };

    const otherEmail = `other-${Date.now()}@example.com`;
    await request(server).post('/auth/register').send({ email: otherEmail, name: 'Other', password }).expect(201);
    const login = await request(server).post('/auth/login').send({ email: otherEmail, password }).expect(200);
    const other = { Authorization: `Bearer ${(login.body as { access_token: string }).access_token}` };

    const created = await request(server).post('/tasks').set(owner).send({ title: 'private' }).expect(201);
    const id = (created.body as { id: number }).id;

    const list = await request(server).get('/tasks').set(other).expect(200);
    expect((list.body as { id: number }[]).map((t) => t.id)).not.toContain(id);
    await request(server).get(`/tasks/${id}`).set(other).expect(404);
    await request(server).patch(`/tasks/${id}`).set(other).send({ title: 'hijacked' }).expect(404);
    await request(server).delete(`/tasks/${id}`).set(other).expect(404);

    const mine = await request(server).get(`/tasks/${id}`).set(owner).expect(200);
    expect((mine.body as { title: string }).title).toBe('private');
  });

  it('does not load the password hash into the authenticated user', async () => {
    // JwtStrategy.validate() sets request.user from findById(), so this is what every guarded handler sees.
    const { sub } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { sub: number };
    const user = await app.get(UsersService).findById(sub);

    expect(user?.email).toBe(email);
    expect(user?.password).toBeUndefined();
  });

  it('POST /premium-echo forbids a standard user', () => {
    return request(app.getHttpServer())
      .post('/premium-echo')
      .set({ Authorization: `Bearer ${token}` })
      .send({})
      .expect(403);
  });

  it('rate limits the auth endpoints', async () => {
    const previous = process.env.THROTTLE_AUTH_LIMIT;
    process.env.THROTTLE_AUTH_LIMIT = '1';
    try {
      const server = app.getHttpServer();
      await request(server).post('/auth/login').send({ email, password });
      await request(server).post('/auth/login').send({ email, password }).expect(429);
    } finally {
      // Assigning undefined would store the string "undefined".
      if (previous === undefined) delete process.env.THROTTLE_AUTH_LIMIT;
      else process.env.THROTTLE_AUTH_LIMIT = previous;
      // The 429 blocks the route for a full window whatever the limit is now, so clear it for later tests.
      app.get<ThrottlerStorageService>(getStorageToken()).storage.clear();
    }
  });
});
