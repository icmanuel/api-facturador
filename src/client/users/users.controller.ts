import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientUsersService } from './users.service';
import { CreateClientUserDto } from './dto/create-client-user.dto';
import { UpdateClientUserDto } from './dto/update-client-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client - Users')
@ApiBearerAuth()
@Controller('client/users')
export class ClientUsersController {
  constructor(private readonly usersService: ClientUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios de la cuenta' })
  findAll(@CurrentUser('accountId') accountId: number) {
    return this.usersService.findAll(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario de cuenta' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreateClientUserDto,
  ) {
    return this.usersService.create(accountId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario de cuenta' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientUserDto,
  ) {
    return this.usersService.update(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario de cuenta' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(accountId, id);
  }
}
