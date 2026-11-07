import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

/**
 * Not PartialType(CreateTaskDto): the @IsOptional() it adds also skips
 * validation for `null`, which NOT NULL columns then reject with a 500.
 * Here a missing field is skipped and `null` fails with a 400, except for
 * `description`, which is nullable and can be cleared with `null`.
 */
export class UpdateTaskDto {
  @ValidateIf((_object: object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ValidateIf((_object: object, value: unknown) => value !== undefined)
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
