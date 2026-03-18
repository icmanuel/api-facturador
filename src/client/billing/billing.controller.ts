import { Controller, Get, Query, ParseIntPipe, Optional } from '@nestjs/common';
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
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  getBillingSummary(
    @CurrentUser('accountId') accountId: number,
    @Query('companyId') companyId?: string,
  ) {
    if (companyId) {
      return this.billingService.getBillingSummary(accountId, Number(companyId));
    }
    return this.billingService.getAccountBilling(accountId);
  }
}
