import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { QueueModule } from 'src/common/queue/queue.module';
import { TransactionsWebhookController } from './webhook/transactions-webhook.controller';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { PermissionsService } from 'src/permissions/permissions.service';

@Module({
  imports: [QueueModule],
  controllers: [TransactionsController, TransactionsWebhookController],
  providers: [
    TransactionsService,
    PrismaService,
    XenditService,
    OpenCageService,
    PermissionsService,
  ],
})
export class TransactionsModule {}
