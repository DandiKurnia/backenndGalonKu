import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Xendit from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY || '',
});

const { Invoice } = xendit;

export interface XenditInvoice {
  id?: string;
  externalId?: string;
  external_id?: string;
  payment_method?: string;
  status: string;
  invoiceUrl?: string;
  invoice_url?: string;
  expiryDate: Date | string;
}

export type XenditInvoicePayload = {
  externalID?: string;
  externalId?: string;
  amount: number;
} & Record<string, unknown>;

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);

  async createInvoice(data: XenditInvoicePayload): Promise<XenditInvoice> {
    const externalId = data.externalId ?? data.externalID;

    if (!externalId) {
      throw new BadRequestException(
        'externalId is required to create an invoice',
      );
    }

    const normalizedData = {
      ...data,
      externalId,
    };

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return (await Invoice.createInvoice({
          data: normalizedData,
        })) as unknown as XenditInvoice;
      } catch (error: unknown) {
        const err = error as Error & {
          code?: string;
          cause?: Error & { code?: string };
        };
        const isTimeout =
          err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err.message?.includes('timeout') ||
          err.message?.includes('Timeout');

        if (isTimeout && attempt < maxRetries) {
          this.logger.warn(
            `[Attempt ${attempt}/${maxRetries}] Timeout when connecting to Xendit. Retrying in ${attempt * 500}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }

        if (isTimeout && attempt === maxRetries) {
          this.logger.error(
            `Failed to create Xendit invoice after ${maxRetries} attempts due to connection timeouts.`,
          );
        }

        throw error;
      }
    }

    throw new Error('Unexpected error in createInvoice');
  }
}
