import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SettingEntry {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntry)
  settings: SettingEntry[];
}
