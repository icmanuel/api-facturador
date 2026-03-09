import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'El refresh token obtenido en el login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
