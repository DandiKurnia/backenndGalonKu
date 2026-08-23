import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { DeviceStatus } from 'src/common/enum/device-status';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('devices/code')
@UseGuards(DeviceAuthGuard)
@ApiTags('Public Devices')
export class DevicesPublicController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':code/status')
  @ApiOperation({ summary: 'Get device status (IoT)' })
  async getStatus(
    @Param('code') code: string,
  ): Promise<BaseResponse<{ qrStatus: string; totalGalon: number }>> {
    const result = await this.devicesService.getStatus(code);

    return {
      data: {
        qrStatus: result.qrStatus,
        totalGalon: result.totalGalon,
      },
      message: 'Device status retrieved successfully',
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Update QR status (IoT device)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'DEV-1' },
        status: {
          type: 'string',
          example: 'SCANNED',
          enum: ['SCANNED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'DONE'],
        },
      },
    },
  })
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
