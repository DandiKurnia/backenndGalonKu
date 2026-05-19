import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';

import { PaymentExpiredJobData } from './proccessor/payment-expired-queue.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('payment-expired-queue')
    private paymentQueue: Queue<PaymentExpiredJobData>,
  ) {}

  async addPaymentExpiryJob(data: PaymentExpiredJobData, expiryDate: Date) {
    const delay = expiryDate.getTime() - Date.now();

    if (delay <= 0) {
      return this.paymentQueue.add('expire-payment', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      });
    }

    return await this.paymentQueue.add('expire-payment', data, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  async cancelPaymentExpiryJob(paymentId: number) {
    const jobs = await this.paymentQueue.getJobs(['delayed', 'waiting']);

    for (const job of jobs) {
      if (job.data.paymentId === paymentId) {
        await job.remove();
        break;
      }
    }
  }
}
