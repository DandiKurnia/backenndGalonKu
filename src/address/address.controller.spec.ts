import { Test, TestingModule } from '@nestjs/testing';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';

describe('AddressController', () => {
  let controller: AddressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        { provide: AddressService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: OpenCageService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<AddressController>(AddressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
