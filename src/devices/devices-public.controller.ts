import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { DeviceStatus } from 'src/common/enum/device-status';

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

  @Patch()
  async updateQRStatus(
    @Body('code') code: string,
    @Body('status') status: string,
  ): Promise<BaseResponse<void>> {
    let qrStatus = status.toUpperCase() as DeviceStatus;
    if ((qrStatus as string) === 'DONE') {
      qrStatus = DeviceStatus.SUCCESS;
    }
    await this.devicesService.updateQRStatus(code, qrStatus);
    return {
      data: null,
      message: 'Device status updated successfully',
    };
  }
}
