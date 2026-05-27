import { XenditService } from './../common/xendit/xendit.service';
import { XenditInvoice } from 'src/common/xendit/xendit.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Transaction, Payment } from '@prisma/client';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { QueueService } from 'src/common/queue/queue.service';
import { XenditWebhookDto } from './dto/xendit-webhook.dto';

type NormalizedInvoice = {
  id: string | null;
  externalId: string;
  status: string;
  invoiceUrl: string;
  expiryDate: Date;
  paymentMethod?: string;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditService: XenditService,
    private readonly queueService: QueueService,
  ) {}

  async create(
    userId: number,
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction & { payment: Payment }> {
    const device = await this.prisma.device.findUnique({
      where: { deviceCode: createTransactionDto.deviceCode },
    });

    if (!device) {
      throw new BadRequestException('Device not found or invalid QR Code');
    }

    const pricePerGalon = 8000;
    const totalPrice = pricePerGalon * createTransactionDto.totalGalon;

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const newTransaction = await prisma.transaction.create({
        data: {
          userId: userId,
          deviceId: device.id,
          status: PaymentStatus.PENDING,
          totalGalon: createTransactionDto.totalGalon,
          totalPrice: totalPrice,
        },
      });

      await prisma.transactionDetail.create({
        data: {
          transactionId: newTransaction.id,
          galonQty: createTransactionDto.totalGalon,
          priceOneGalon: pricePerGalon,
          subTotal: totalPrice,
        },
      });

      return newTransaction;
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.email) {
      throw new BadRequestException('User email not found');
    }

    const rawInvoice = await this.xenditService.createInvoice({
      externalID: `INV-${Date.now()}-${transaction.id}`,
      amount: totalPrice,
      payerEmail: user.email,
      successRedirectURL: `${process.env.FRONTEND_URL}/transactions/${transaction.id}`,
      invoiceDuration: 86400,
    });

    const normalizedInvoice = this.normalizeInvoice(rawInvoice);

    const payment = await this.prisma.$transaction(async (prisma) => {
      const newPayment = await prisma.payment.create({
        data: {
          transactionId: transaction.id,
          externalId: normalizedInvoice.externalId,
          invoiceId: normalizedInvoice.id,
          status: normalizedInvoice.status,
          invoiceUrl: normalizedInvoice.invoiceUrl,
          expiryDate: normalizedInvoice.expiryDate,
          paymentMethod: normalizedInvoice.paymentMethod,
        },
      });

      await prisma.transactionHistory.create({
        data: {
          transactionId: transaction.id,
          status: PaymentStatus.PENDING,
          description: `Payment created with total price ${totalPrice}`,
        },
      });

      return newPayment;
    });

    try {
      await this.queueService.addPaymentExpiryJob(
        {
          paymentId: payment.id,
          transactionId: transaction.id,
          externalId: normalizedInvoice.externalId,
        },
        normalizedInvoice.expiryDate,
      );
    } catch (error) {
      console.error(
        `Failed to enqueue payment expiry job for transaction ${transaction.id}:`,
        error,
      );
    }

    return {
      ...transaction,
      payment,
    };
  }

  async handlePaymentWebhook(webhookData: XenditWebhookDto): Promise<void> {
    const normalizedStatus = webhookData.status;

    const isSusccessfulPayment =
      normalizedStatus === PaymentStatus.PAID ||
      normalizedStatus === PaymentStatus.SETTLED;

    const payment = await this.prisma.payment.findUnique({
      where: { externalId: webhookData.external_id },
      include: {
        transaction: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with external ID ${webhookData.external_id} not found`,
      );
    }

    const paymentId: number = Number(payment.id);
    const transactionId: number = Number(payment.transactionId);
    const totalPrice: number = Number(payment.transaction.totalPrice);
    console.log(paymentId, transactionId, totalPrice);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: normalizedStatus,
          paymentMethod: webhookData.payment_method,
        },
      });

      if (isSusccessfulPayment) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: normalizedStatus,
          },
        });

        await prisma.transactionHistory.create({
          data: {
            transactionId: transactionId,
            userId: payment.transaction.user.id,
            status: normalizedStatus,
            description: `Payment ${normalizedStatus} with total price ${totalPrice}`,
          },
        });
      }
    });

    try {
      await this.queueService.cancelPaymentExpiryJob(payment.id);
    } catch (error) {
      console.error(
        `Failed to cancel payment expiry job for payment ${payment.id}:`,
        error,
      );
    }

    if (!isSusccessfulPayment) {
      return;
    }
  }

  private normalizeInvoice(invoice: XenditInvoice): NormalizedInvoice {
    const expiryDate =
      invoice.expiryDate instanceof Date
        ? invoice.expiryDate
        : new Date(invoice.expiryDate);

    const externalId = invoice.externalId ?? invoice.external_id;
    const invoiceUrl = invoice.invoiceUrl ?? invoice.invoice_url;

    if (Number.isNaN(expiryDate.getTime())) {
      throw new Error('Invalid invoice expiry date from Xendit');
    }

    if (!externalId) {
      throw new Error('Missing externalId from Xendit invoice response');
    }

    if (!invoiceUrl) {
      throw new Error('Missing invoiceUrl from Xendit invoice response');
    }

    return {
      id: invoice.id ?? null,
      externalId,
      status: invoice.status,
      paymentMethod: invoice.payment_method,
      invoiceUrl,
      expiryDate,
    };
  }

  // findAll: ringan, cukup untuk render list/tabel
  private readonly listInclude = {
    payment: {
      select: {
        status: true,
      },
    },
    user: {
      select: {
        name: true,
      },
    },
    device: {
      select: {
        name: true,
      },
    },
  };

  // findOne: lengkap, untuk halaman detail transaksi (customer)
  private readonly detailInclude = {
    payment: {
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        invoiceUrl: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
    },
    device: {
      include: {
        address: true,
      },
    },
    transactionDetails: true,
    transactionHistories: {
      orderBy: { createdAt: 'desc' as const },
    },
    waterFillLogs: {
      orderBy: { createdAt: 'desc' as const },
    },
  };

  // findOne: varian admin/operator, ikut expose field internal Xendit untuk debugging
  private readonly detailIncludeAdmin = {
    ...this.detailInclude,
    payment: true,
  };

  async findAll(userId: number) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const roleKey = currentUser.role.key;

    if (roleKey === 'super-admin') {
      return this.prisma.transaction.findMany({
        include: this.listInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (roleKey === 'operator') {
      if (!currentUser.addressId) {
        throw new BadRequestException(
          'Operator does not have an assigned address',
        );
      }

      return this.prisma.transaction.findMany({
        where: {
          device: { addressId: currentUser.addressId },
        },
        include: this.listInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.transaction.findMany({
      where: { userId },
      include: this.listInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const roleKey = currentUser.role.key;

    if (roleKey === 'super-admin') {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
        include: this.detailIncludeAdmin,
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction #${id} not found`);
      }

      return transaction;
    }

    if (roleKey === 'operator') {
      if (!currentUser.addressId) {
        throw new BadRequestException(
          'Operator does not have an assigned address',
        );
      }

      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id,
          device: { addressId: currentUser.addressId },
        },
        include: this.detailIncludeAdmin,
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction #${id} not found`);
      }

      return transaction;
    }

    // customer: hanya bisa akses transaksi miliknya sendiri
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: this.detailInclude,
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }

    return transaction;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
