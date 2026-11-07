import { SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Role } from './users/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Emails are stored and looked up trimmed and lowercased, so they match case-insensitively. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Applies normalizeEmail() to a DTO field before it is validated. */
export const NormalizeEmail = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeEmail(value) : value));
