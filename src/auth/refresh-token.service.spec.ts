import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';
import { LoggerService } from '../logger/logger.service';

const ID = '11111111-2222-4333-8444-555555555555';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  // The transaction's entity manager hands back the same mocked repository.
  const tx = { query: vi.fn(), getRepository: vi.fn(() => repo) };
  const repo = {
    create: vi.fn((x: Partial<RefreshToken>) => x),
    save: vi.fn((x: Partial<RefreshToken>) => Promise.resolve({ ...x, id: ID })),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    manager: { transaction: vi.fn((fn: (manager: typeof tx) => unknown) => fn(tx)) },
  };
  const logger = { warn: vi.fn(), log: vi.fn() };

  const record = (over: Partial<RefreshToken> = {}): RefreshToken => ({
    id: ID,
    userId: 7,
    familyId: 'fam-1',
    tokenHash: hash('secret'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...over,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(RefreshToken), useValue: repo },
        { provide: ConfigService, useValue: { get: vi.fn(() => 30) } },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    service = module.get(RefreshTokenService);
    repo.update.mockResolvedValue({ affected: 1 });
  });

  afterEach(() => vi.clearAllMocks());

  it('issues an opaque <id>.<secret> token and stores only its hash', async () => {
    const { token, expiresAt } = await service.issue(7);
    const [id, secret] = token.split('.');

    expect(id).toBe(ID);
    expect(secret.length).toBeGreaterThanOrEqual(43);
    const saved = repo.save.mock.calls[0][0] as RefreshToken;
    expect(saved.tokenHash).toBe(hash(secret));
    expect(JSON.stringify(saved)).not.toContain(secret);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 86_400_000);
  });

  it('rotates a valid token within the same family', async () => {
    repo.findOne.mockResolvedValue(record());

    const result = await service.rotate(`${ID}.secret`);

    expect(result.userId).toBe(7);
    expect(repo.update).toHaveBeenCalledWith({ id: ID, revokedAt: expect.anything() }, { revokedAt: expect.any(Date) });
    expect((repo.save.mock.calls[0][0] as RefreshToken).familyId).toBe('fam-1');
    // The claim and the insert run in one transaction that holds the family lock.
    expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(tx.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['fam-1']);
  });

  it('rejects malformed, unknown and wrong-secret tokens without touching the family', async () => {
    await expect(service.rotate('garbage')).rejects.toThrow(UnauthorizedException);
    await expect(service.rotate(`not-a-uuid.secret`)).rejects.toThrow(UnauthorizedException);
    // 36 characters from the uuid alphabet, but not a uuid: PostgreSQL would fail the query with a 500.
    await expect(service.rotate(`${'-'.repeat(36)}.secret`)).rejects.toThrow(UnauthorizedException);
    expect(repo.findOne).not.toHaveBeenCalled();

    repo.findOne.mockResolvedValue(null);
    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow(UnauthorizedException);

    repo.findOne.mockResolvedValue(record());
    await expect(service.rotate(`${ID}.wrong`)).rejects.toThrow(UnauthorizedException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    repo.findOne.mockResolvedValue(record({ expiresAt: new Date(Date.now() - 1) }));
    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow('Refresh token expired');
  });

  it('revokes the whole family when a token is reused after the grace window', async () => {
    repo.findOne.mockResolvedValue(record({ revokedAt: new Date(Date.now() - 60_000) }));

    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow(UnauthorizedException);
    expect(repo.update).toHaveBeenCalledWith({ familyId: 'fam-1', revokedAt: expect.anything() }, { revokedAt: expect.any(Date) });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not report reuse for a session that has already ended', async () => {
    repo.findOne.mockResolvedValue(record({ revokedAt: new Date(Date.now() - 60_000) }));
    repo.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow(UnauthorizedException);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats a reuse inside the grace window as a retry and keeps the family', async () => {
    repo.findOne.mockResolvedValue(record({ revokedAt: new Date(Date.now() - 1_000) }));

    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow(UnauthorizedException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('lets only one of two concurrent refreshes win', async () => {
    repo.findOne.mockResolvedValue(record());
    repo.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.rotate(`${ID}.secret`)).rejects.toThrow(UnauthorizedException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('revoke() ends the family and ignores unknown tokens', async () => {
    repo.findOne.mockResolvedValue(record());
    await service.revoke(`${ID}.secret`);
    expect(repo.update).toHaveBeenCalledWith({ familyId: 'fam-1', revokedAt: expect.anything() }, { revokedAt: expect.any(Date) });

    repo.update.mockClear();
    await service.revoke('garbage');
    expect(repo.update).not.toHaveBeenCalled();
  });
});
