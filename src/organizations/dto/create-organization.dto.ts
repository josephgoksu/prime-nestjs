import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../custom.decorator';

export class CreateOrganizationDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;
}
