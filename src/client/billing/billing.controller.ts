import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientBillingService } from './billing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client - Facturacion')
@ApiBearerAuth()
@Controller('client/billing')
export class ClientBillingController {
  constructor(private readonly billingService: ClientBillingService) {}

  @Get()
  @ApiOperation({ summary: 'Resumen de facturacion y uso del plan' })
  @ApiQuery({ name: 'companyId', required: true, type: Number })
  getBillingSummary(
    @CurrentUser('accountId') accountId: number,
    @Query('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.billingService.getBillingSummary(accountId, companyId);
  }
}
