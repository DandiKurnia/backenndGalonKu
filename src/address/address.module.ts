import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { OpenCageService } from 'src/common/opencage/opencage.service';

@Module({
  controllers: [AddressController],
  providers: [AddressService, PrismaService, OpenCageService],
})
export class AddressModule {}
