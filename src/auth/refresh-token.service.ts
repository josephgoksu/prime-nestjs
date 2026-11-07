import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
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
  issue(userId: number, familyId: string = randomUUID()): Promise<IssuedRefreshToken> {
    return this.create(userId, familyId);
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
      if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS) {
        await this.revokeFamily(record.familyId);
        this.logger.warn(`Refresh token reuse detected for user ${record.userId}; session ${record.familyId} revoked`);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Claim the token atomically so two concurrent refreshes cannot both succeed.
    const claimed = await this.tokens.update({ id: record.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    if (!claimed.affected) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { userId: record.userId, refreshToken: await this.create(record.userId, record.familyId) };
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
    const result = await this.tokens.delete({ expiresAt: LessThan(new Date(Date.now() - 86_400_000)) });
    if (result.affected) {
      this.logger.log(`Purged ${result.affected} expired refresh tokens`);
    }
  }

  private async create(userId: number, familyId: string): Promise<IssuedRefreshToken> {
    const secret = randomBytes(32).toString('base64url');
    const ttlDays = this.config.get<number>('jwt.refreshTokenTtlDays', 30);
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
    const saved = await this.tokens.save(this.tokens.create({ userId, familyId, tokenHash: sha256(secret), expiresAt, revokedAt: null }));
    return { token: `${saved.id}.${secret}`, expiresAt };
  }

  /** Token format: <uuid>.<secret>. Looks up by id, then compares the hash in constant time. */
  private async find(presented: string): Promise<RefreshToken | null> {
    const [id, secret, extra] = presented.split('.');
    if (!id || !secret || extra !== undefined || !/^[0-9a-f-]{36}$/i.test(id)) {
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

  private async revokeFamily(familyId: string): Promise<void> {
    await this.tokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
