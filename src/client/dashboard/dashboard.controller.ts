import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientDashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client - Dashboard')
@ApiBearerAuth()
@Controller('client/dashboard')
export class ClientDashboardController {
  constructor(private readonly dashboardService: ClientDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard del cliente' })
  @ApiQuery({ name: 'companyId', required: true, type: Number })
  getDashboard(
    @CurrentUser('accountId') accountId: number,
    @Query('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.dashboardService.getDashboard(accountId, companyId);
  }
}
