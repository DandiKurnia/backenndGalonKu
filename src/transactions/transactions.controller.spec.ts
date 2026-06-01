import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { QueueService } from 'src/common/queue/queue.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: XenditService, useValue: {} },
        { provide: QueueService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
