import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QrcodeService } from 'src/qrcode/qrcode.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';

describe('DevicesController', () => {
  let controller: DevicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: DevicesService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: QrcodeService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
