import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../custom.decorator';

/**
 * Not PartialType(CreateOrganizationDto): the @IsOptional() it adds also skips
 * validation for `null`, which the NOT NULL column then rejects with a 500.
 * Here only a missing name is skipped, and `null` fails with a 400.
 */
export class UpdateOrganizationDto {
  @ValidateIf((_object: object, value: unknown) => value !== undefined)
  @Trim()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name?: string;
}
