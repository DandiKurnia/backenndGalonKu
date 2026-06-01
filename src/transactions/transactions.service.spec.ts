import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { QueueService } from 'src/common/queue/queue.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: {} },
        { provide: XenditService, useValue: {} },
        { provide: QueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
