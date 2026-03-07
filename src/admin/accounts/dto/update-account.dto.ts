import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['adminName', 'adminEmail', 'adminPassword', 'warningMessage'] as const),
) {
  @ApiPropertyOptional({ description: 'Activar o desactivar la cuenta' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Mensaje de advertencia (null para eliminar)', nullable: true })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  warningMessage?: string | null;
}
