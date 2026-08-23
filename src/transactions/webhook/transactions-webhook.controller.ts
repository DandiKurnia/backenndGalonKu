import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { XenditWebhookDto } from '../dto/xendit-webhook.dto';
import { TransactionsService } from '../transactions.service';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('transactions/webhook')
@ApiTags('Transactions Webhook')
export class TransactionsWebhookController {
  constructor(private readonly transactionService: TransactionsService) {}

  @Post('xendit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xendit payment callback (webhook)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'invoice_xendit_id' },
        external_id: { type: 'string', example: 'INV-1705290600000-1' },
        status: { type: 'string', example: 'PAID' },
        amount: { type: 'number', example: 40000 },
        payment_method: { type: 'string', example: 'VA' },
        bank_code: { type: 'string', example: 'BCA' },
        paid_at: { type: 'string', example: '2024-01-15T10:32:00.000Z', nullable: true },
      },
    },
  })
  async handleXenditWebhook(
    @Body() webhookData: XenditWebhookDto,
  ): Promise<{ message: string }> {
    await this.transactionService.handlePaymentWebhook(webhookData);
    return { message: 'Webhook received successfully' };
  }
}
