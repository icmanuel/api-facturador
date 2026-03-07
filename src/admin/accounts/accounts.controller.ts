import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountUserDto } from './dto/create-account-user.dto';
import { UpdateAccountUserDto } from './dto/update-account-user.dto';

@ApiTags('Admin - Cuentas')
@ApiBearerAuth()
@Controller('admin/accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas con paginación' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cuenta' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cuenta' })
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cuenta' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.service.update(id, dto);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Listar usuarios de la cuenta' })
  findUsers(@Param('id', ParseIntPipe) id: number) {
    return this.service.findUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Crear usuario en la cuenta' })
  createUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAccountUserDto,
  ) {
    return this.service.createUser(id, dto);
  }

  @Patch(':accId/users/:userId')
  @ApiOperation({ summary: 'Actualizar usuario de la cuenta' })
  updateUser(
    @Param('accId', ParseIntPipe) accId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateAccountUserDto,
  ) {
    return this.service.updateUser(accId, userId, dto);
  }

  @Delete(':accId/users/:userId')
  @ApiOperation({ summary: 'Desactivar usuario de la cuenta' })
  removeUser(
    @Param('accId', ParseIntPipe) accId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.removeUser(accId, userId);
  }
}
