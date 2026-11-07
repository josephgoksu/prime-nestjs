import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

type Org = { id: number; name: string; role: string };
type Member = { userId: number; email: string; role: string };
type Task = { id: number; title: string; ownerId: number; organizationId: number | null };

describe('Organizations (e2e)', () => {
  let app: INestApplication<App>;
  const run = Date.now();
  const users: Record<'owner' | 'admin' | 'member' | 'outsider', { email: string; token: string; id: number }> = {} as never;
  let orgId: number;

  const server = () => app.getHttpServer();
  const as = (who: keyof typeof users) => ({ Authorization: `Bearer ${users[who].token}` });
  const inOrg = (who: keyof typeof users, id = orgId) => ({ ...as(who), 'X-Organization-Id': String(id) });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    for (const who of ['owner', 'admin', 'member', 'outsider'] as const) {
      const email = `org-${who}-${run}@example.com`;
      await request(server()).post('/auth/register').send({ email, name: who, password: 'password123' }).expect(201);
      const login = await request(server()).post('/auth/login').send({ email, password: 'password123' }).expect(200);
      const token = (login.body as { access_token: string }).access_token;
      const me = await request(server())
        .get('/auth/me')
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);
      users[who] = { email, token, id: (me.body as { id: number }).id };
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an organization with the creator as owner', async () => {
    const res = await request(server()).post('/organizations').set(as('owner')).send({ name: '  Acme  ' }).expect(201);
    const org = res.body as Org;
    expect(org).toMatchObject({ name: 'Acme', role: 'owner' });
    orgId = org.id;

    const mine = (await request(server()).get('/organizations').set(as('owner')).expect(200)).body as Org[];
    expect(mine).toEqual([expect.objectContaining({ id: orgId, role: 'owner' })]);
  });

  it('hides the organization from non-members', async () => {
    await request(server()).get(`/organizations/${orgId}`).set(as('outsider')).expect(404);
    await request(server()).get('/tasks').set(inOrg('outsider')).expect(404);
    await request(server()).get('/tasks').set(inOrg('outsider', 2147483647)).expect(404);
    await request(server())
      .get('/tasks')
      .set(inOrg('outsider', 'abc' as unknown as number))
      .expect(400);
  });

  it('adds members and enforces roles', async () => {
    await request(server()).post(`/organizations/${orgId}/members`).set(as('owner')).send({ email: users.admin.email, role: 'admin' }).expect(201);
    const added = await request(server())
      .post(`/organizations/${orgId}/members`)
      .set(as('admin'))
      .send({ email: users.member.email.toUpperCase() })
      .expect(201);
    expect(added.body).toMatchObject({ userId: users.member.id, role: 'member' });

    // Duplicates, unknown users, and owner grants by an admin are refused.
    await request(server()).post(`/organizations/${orgId}/members`).set(as('owner')).send({ email: users.member.email }).expect(409);
    await request(server())
      .post(`/organizations/${orgId}/members`)
      .set(as('owner'))
      .send({ email: `nobody-${run}@example.com` })
      .expect(404);
    await request(server()).post(`/organizations/${orgId}/members`).set(as('admin')).send({ email: users.outsider.email, role: 'owner' }).expect(403);
    // Members cannot manage members or rename the organization.
    await request(server()).post(`/organizations/${orgId}/members`).set(as('member')).send({ email: users.outsider.email }).expect(403);
    await request(server()).patch(`/organizations/${orgId}`).set(as('member')).send({ name: 'Nope' }).expect(403);
    await request(server()).patch(`/organizations/${orgId}`).set(as('admin')).send({ name: null }).expect(400);
    await request(server()).patch(`/organizations/${orgId}`).set(as('admin')).send({ name: 'Acme Ltd' }).expect(200);
    await request(server()).patch(`/organizations/${orgId}/members/99999999999`).set(as('admin')).send({ role: 'member' }).expect(400);

    const members = (await request(server()).get(`/organizations/${orgId}/members`).set(as('member')).expect(200)).body as Member[];
    expect(members.map((m) => m.role)).toEqual(['owner', 'admin', 'member']);
    expect(JSON.stringify(members)).not.toContain('password');
  });

  it('keeps organization tasks apart from personal tasks', async () => {
    await request(server()).post('/tasks').set(as('member')).send({ title: 'Personal' }).expect(201);
    const shared = (await request(server()).post('/tasks').set(inOrg('member')).send({ title: 'Shared' }).expect(201)).body as Task;
    expect(shared).toMatchObject({ organizationId: orgId, ownerId: users.member.id });

    const personal = (await request(server()).get('/tasks').set(as('member')).expect(200)).body as Task[];
    expect(personal.map((t) => t.title)).toEqual(['Personal']);

    // Every member sees and edits organization tasks.
    const seenByAdmin = (await request(server()).get('/tasks').set(inOrg('admin')).expect(200)).body as Task[];
    expect(seenByAdmin.map((t) => t.title)).toEqual(['Shared']);
    await request(server()).patch(`/tasks/${shared.id}`).set(inOrg('owner')).send({ status: 'in_progress' }).expect(200);

    // Nulls and out-of-range ids are 400s, not database errors.
    await request(server()).patch(`/tasks/${shared.id}`).set(inOrg('owner')).send({ title: null }).expect(400);
    await request(server()).get('/tasks/99999999999').set(as('member')).expect(400);
    await request(server())
      .get('/tasks')
      .set({ ...as('member'), 'X-Organization-Id': '' })
      .expect(400);

    // An organization task is not reachable without the header.
    await request(server()).get(`/tasks/${shared.id}`).set(as('member')).expect(404);
  });

  it('lets only the creator or an admin delete an organization task', async () => {
    const task = (await request(server()).post('/tasks').set(inOrg('admin')).send({ title: 'Admin task' }).expect(201)).body as Task;
    await request(server()).delete(`/tasks/${task.id}`).set(inOrg('member')).expect(403);
    await request(server()).delete(`/tasks/${task.id}`).set(inOrg('owner')).expect(204);
  });

  it('always keeps an owner', async () => {
    await request(server()).patch(`/organizations/${orgId}/members/${users.owner.id}`).set(as('owner')).send({ role: 'admin' }).expect(409);
    await request(server()).delete(`/organizations/${orgId}/members/${users.owner.id}`).set(as('owner')).expect(409);
    await request(server()).delete(`/organizations/${orgId}/members/${users.owner.id}`).set(as('admin')).expect(403);
    await request(server()).patch(`/organizations/${orgId}/members/${users.member.id}`).set(as('admin')).send({ role: 'owner' }).expect(403);

    // Hand over ownership, then the old owner can step down.
    await request(server()).patch(`/organizations/${orgId}/members/${users.admin.id}`).set(as('owner')).send({ role: 'owner' }).expect(200);
    await request(server()).patch(`/organizations/${orgId}/members/${users.owner.id}`).set(as('owner')).send({ role: 'member' }).expect(200);
  });

  it('lets a member leave and an owner delete the organization', async () => {
    await request(server()).delete(`/organizations/${orgId}/members/${users.member.id}`).set(as('member')).expect(204);
    await request(server()).get('/tasks').set(inOrg('member')).expect(404);

    await request(server()).delete(`/organizations/${orgId}`).set(as('owner')).expect(403);
    await request(server()).delete(`/organizations/${orgId}`).set(as('admin')).expect(204);
    await request(server()).get(`/organizations/${orgId}`).set(as('admin')).expect(404);
  });
});
