import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { XenditWebhookDto } from '../dto/xendit-webhook.dto';
import { TransactionsService } from '../transactions.service';

@Controller('transactions/webhook')
export class TransactionsWebhookController {
  constructor(private readonly transactionService: TransactionsService) {}

  @Post('xendit')
  @HttpCode(HttpStatus.OK)
  async handleXenditWebhook(
    @Body() webhookData: XenditWebhookDto,
  ): Promise<{ message: string }> {
    await this.transactionService.handlePaymentWebhook(webhookData);
    return { message: 'Webhook received successfully' };
  }
}
