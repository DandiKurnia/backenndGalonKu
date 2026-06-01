import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
