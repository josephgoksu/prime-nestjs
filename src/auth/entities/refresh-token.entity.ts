import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * One issued refresh token. Only a SHA-256 hash of the secret is stored, so a
 * database leak does not leak usable tokens.
 *
 * Tokens rotate: each refresh revokes the presented token and issues a new
 * one in the same family. Presenting a revoked token again means it was
 * copied, so the whole family (that login session) is revoked.
 */
@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** Shared by every token issued from one login. */
  @Index()
  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ length: 64 })
  tokenHash: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
