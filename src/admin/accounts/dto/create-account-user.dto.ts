import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountUserRole } from '../../../entities/enums';

export class CreateAccountUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: AccountUserRole, default: AccountUserRole.VIEWER })
  @IsOptional()
  @IsEnum(AccountUserRole)
  role?: AccountUserRole;
}
