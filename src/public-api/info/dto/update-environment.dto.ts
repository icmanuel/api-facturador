import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyEnv } from '../../../entities/enums';

export class UpdateEnvironmentDto {
  @ApiProperty({
    description: 'Ambiente SRI: test (pruebas) o production (producción)',
    enum: CompanyEnv,
    example: 'production',
  })
  @IsEnum(CompanyEnv)
  env: CompanyEnv;
}
