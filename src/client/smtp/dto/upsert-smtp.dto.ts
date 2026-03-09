import { IsString, IsInt, IsEmail, IsIn, IsBoolean, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSmtpDto {
  @ApiProperty({ example: 'smtp.gmail.com' })
  @IsString()
  @MaxLength(255)
  host: string;

  @ApiProperty({ example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ enum: ['tls', 'ssl', 'none'], example: 'tls' })
  @IsIn(['tls', 'ssl', 'none'])
  secure: string;

  @ApiProperty({ example: 'user@gmail.com' })
  @IsString()
  @MaxLength(255)
  user: string;

  @ApiPropertyOptional({ description: 'Dejar vacío para no cambiar el password existente' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'noreply@miempresa.com' })
  @IsEmail()
  @MaxLength(254)
  fromEmail: string;

  @ApiProperty({ example: 'Mi Empresa S.A.' })
  @IsString()
  @MaxLength(100)
  fromName: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
