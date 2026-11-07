import { SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { Role } from './users/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Emails are stored and looked up trimmed and lowercased, so they match case-insensitively. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Applies normalizeEmail() to a DTO field before it is validated. */
export const NormalizeEmail = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeEmail(value) : value));

/** Trims a string DTO field before it is validated. */
export const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

const strictLimit = () => parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '', 10) || 10;

/**
 * THROTTLE_AUTH_LIMIT requests per window instead of the global limit. For endpoints that
 * take credentials or reveal whether an account exists (login, register, adding members).
 */
export const StrictThrottle = () => Throttle({ default: { limit: strictLimit } });
