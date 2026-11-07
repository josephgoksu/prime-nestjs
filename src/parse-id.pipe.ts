import { BadRequestException, PipeTransform } from '@nestjs/common';

const MAX_INT4 = 2_147_483_647;

/**
 * Parses a positive id that fits a PostgreSQL `integer` column. Anything else,
 * including numbers past that range, is a 400 instead of a database error (500).
 */
export const parseId = (raw: string, label: string): number => {
  if (!/^[1-9]\d{0,9}$/.test(raw) || Number(raw) > MAX_INT4) {
    throw new BadRequestException(`${label} must be a positive integer`);
  }
  return Number(raw);
};

/** ParseIntPipe for ids: `@Param('userId', new ParseIdPipe('User id'))`. */
export class ParseIdPipe implements PipeTransform<string, number> {
  constructor(private readonly label = 'Id') {}

  transform(value: string): number {
    return parseId(value, this.label);
  }
}
