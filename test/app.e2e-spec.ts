import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

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
    await request(server).delete(`/tasks/${id}`).set(auth).expect(200);
    await request(server).get(`/tasks/${id}`).set(auth).expect(404);
  });

  it('POST /premium-echo forbids a standard user', () => {
    return request(app.getHttpServer())
      .post('/premium-echo')
      .set({ Authorization: `Bearer ${token}` })
      .send({})
      .expect(403);
  });
});
