import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadCertificateDto {
  @ApiProperty({ description: 'Contraseña del archivo .p12' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
