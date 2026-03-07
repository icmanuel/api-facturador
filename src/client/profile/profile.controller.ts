import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client - Profile')
@ApiBearerAuth()
@Controller('client/profile')
export class ClientProfileController {
  constructor(private readonly profileService: ClientProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener perfil de la cuenta' })
  getProfile(@CurrentUser('accountId') accountId: number) {
    return this.profileService.getProfile(accountId);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar perfil de la cuenta' })
  updateProfile(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(accountId, dto);
  }
}
