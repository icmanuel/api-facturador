import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateXmlDocumentDto {
  @ApiProperty({
    description: 'XML del comprobante electrónico SRI (sin firmar). Se firmará con el certificado de la empresa.',
    example: '<?xml version="1.0" encoding="UTF-8"?><factura id="comprobante" version="2.1.0">...</factura>',
  })
  @IsString()
  @IsNotEmpty({ message: 'El campo xml es obligatorio' })
  xml: string;

  @ApiPropertyOptional({ description: 'Email del comprador (campo plataforma, no SRI)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  emailComprador?: string;

  @ApiPropertyOptional({ description: 'Clave de idempotencia (evita duplicados)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
