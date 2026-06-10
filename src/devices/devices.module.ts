import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesPublicController } from './devices-public.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QrcodeService } from 'src/qrcode/qrcode.service';

@Module({
  controllers: [DevicesPublicController, DevicesController],
  providers: [DevicesService, PrismaService, QrcodeService],
})
export class DevicesModule {}
