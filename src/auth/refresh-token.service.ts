import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isUUID } from 'class-validator';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoggerService } from '../logger/logger.service';

/**
 * A second request with the same token inside this window is treated as a
 * client retry (two tabs, a flaky network), not theft: it is rejected but
 * does not end the session.
 */
const REUSE_GRACE_MS = 10_000;

const DAY_MS = 86_400_000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /** Starts a new session (token family) for a user. */
  issue(userId: number): Promise<IssuedRefreshToken> {
    return this.create(this.tokens, userId, randomUUID());
  }

  /**
   * Exchanges a refresh token for a new one. Returns the user id the new
   * token belongs to. Throws 401 for unknown, expired or revoked tokens.
   */
  async rotate(presented: string): Promise<{ userId: number; refreshToken: IssuedRefreshToken }> {
    const record = await this.find(presented);
    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.revokedAt) {
      // Nothing left to revoke means the session already ended (logout, disabled account): not theft.
      if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS && (await this.revokeFamily(record.familyId)) > 0) {
        this.logger.warn(`Refresh token reuse detected for user ${record.userId}; session ${record.familyId} revoked`);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return this.withFamilyLock(record.familyId, async (tokens) => {
      // Claim the token atomically so two concurrent refreshes cannot both succeed.
      const claimed = await tokens.update({ id: record.id, revokedAt: IsNull() }, { revokedAt: new Date() });
      if (!claimed.affected) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return { userId: record.userId, refreshToken: await this.create(tokens, record.userId, record.familyId) };
    });
  }

  /** Ends the session the token belongs to. Unknown tokens are ignored. */
  async revoke(presented: string): Promise<void> {
    const record = await this.find(presented);
    if (record) {
      await this.revokeFamily(record.familyId);
    }
  }

  /** Ends every session of a user, for example after a password change. */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Deletes tokens that expired more than a day ago. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    const result = await this.tokens.delete({ expiresAt: LessThan(new Date(Date.now() - DAY_MS)) });
    if (result.affected) {
      this.logger.log(`Purged ${result.affected} expired refresh tokens`);
    }
  }

  private async create(tokens: Repository<RefreshToken>, userId: number, familyId: string): Promise<IssuedRefreshToken> {
    const secret = randomBytes(32).toString('base64url');
    const ttlDays = this.config.get<number>('jwt.refreshTokenTtlDays', 30);
    const expiresAt = new Date(Date.now() + ttlDays * DAY_MS);
    const saved = await tokens.save(tokens.create({ userId, familyId, tokenHash: sha256(secret), expiresAt, revokedAt: null }));
    return { token: `${saved.id}.${secret}`, expiresAt };
  }

  /** Token format: <uuid>.<secret>. Looks up by id, then compares the hash in constant time. */
  private async find(presented: string): Promise<RefreshToken | null> {
    const [id, secret, extra] = presented.split('.');
    // A strict check: PostgreSQL rejects a malformed uuid with an error, which would surface as a 500.
    if (!id || !secret || extra !== undefined || !isUUID(id)) {
      return null;
    }
    const record = await this.tokens.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    const expected = Buffer.from(record.tokenHash, 'hex');
    const actual = Buffer.from(sha256(secret), 'hex');
    return timingSafeEqual(expected, actual) ? record : null;
  }

  /** Revokes every live token of a session. Returns how many were revoked. */
  private async revokeFamily(familyId: string): Promise<number> {
    const result = await this.withFamilyLock(familyId, (tokens) => tokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() }));
    return result.affected ?? 0;
  }

  /**
   * Runs fn in a transaction that holds a lock on one token family, so a
   * rotation (claim + insert of the successor) and a revocation of the same
   * family never interleave. Without it, a logout that runs between the claim
   * and the insert misses the new token, and the session outlives the logout.
   */
  private withFamilyLock<T>(familyId: string, fn: (tokens: Repository<RefreshToken>) => Promise<T>): Promise<T> {
    return this.tokens.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [familyId]);
      return fn(manager.getRepository(RefreshToken));
    });
  }
}
