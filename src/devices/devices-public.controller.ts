import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';
import { BaseResponse } from 'src/common/interface/base-response.interface';

@Controller('devices/code')
@UseGuards(DeviceAuthGuard)
export class DevicesPublicController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':code/status')
  async getStatus(
    @Param('code') code: string,
  ): Promise<BaseResponse<{ qrStatus: string }>> {
    const result = await this.devicesService.getStatus(code);

    return {
      data: {
        qrStatus: result,
      },
      message: 'Device status retrieved successfully',
    };
  }
}
