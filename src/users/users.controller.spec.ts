import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: PermissionsService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
