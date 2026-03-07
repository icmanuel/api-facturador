import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '../../../entities/enums';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: '0991234567001' })
  @IsString()
  @Length(13, 13)
  ruc: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: AccountType, default: AccountType.SINGLE })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingCycleDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warningMessage?: string;

  @ApiPropertyOptional({ description: 'Nombre del primer usuario admin' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiPropertyOptional({ description: 'Email del primer usuario admin' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'Password del primer usuario admin' })
  @IsOptional()
  @IsString()
  adminPassword?: string;
}
