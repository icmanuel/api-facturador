import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountUserRole } from '../../../entities/enums';

export class CreateClientUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'juan@miempresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: AccountUserRole, example: AccountUserRole.OPERATOR })
  @IsEnum(AccountUserRole)
  role: AccountUserRole;
}
