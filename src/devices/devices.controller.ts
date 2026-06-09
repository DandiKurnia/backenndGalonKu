import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { JwtAuthGuard } from 'src/auth/guards/legged-in.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { Device } from '@prisma/client';

@Controller('devices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermissions('devices.create')
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
  ): Promise<BaseResponse<{ device: Device; rawDeviceToken: string }>> {
    const result = await this.devicesService.create(createDeviceDto);
    return {
      data: result,
      message:
        'Device created successfully. Store the rawDeviceToken securely — it will not be shown again.',
    };
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: { id: number } },
    @Query('limit') limit?: string,
  ): Promise<BaseResponse<Device[]>> {
    const take = limit && Number(limit) > 0 ? Number(limit) : 0;
    const result = await this.devicesService.findAll(req.user.id, take);
    return {
      data: result,
      message: 'Device retrived successfully',
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: number } },
  ): Promise<BaseResponse<Device>> {
    const result = await this.devicesService.findOne(+id, req.user.id);
    return {
      data: result,
      message: 'Device found successfully',
    };
  }

  @Patch(':id')
  @RequirePermissions('devices.update')
  async update(
    @Param('id') id: number,
    @Body() createDeviceDto: CreateDeviceDto,
  ): Promise<BaseResponse<Device>> {
    const result = await this.devicesService.update(+id, createDeviceDto);
    return {
      data: result,
      message: 'Device updated successfully',
    };
  }

  @Get('scan/:code')
  async findByCode(@Param('code') code: string): Promise<BaseResponse<Device>> {
    const result = await this.devicesService.findByCode(code);
    return {
      data: result,
      message: 'Device found successfully',
    };
  }

  @Post(':id/rotate-token')
  @RequirePermissions('devices.update')
  async rotateToken(
    @Param('id') id: string,
  ): Promise<BaseResponse<{ rawDeviceToken: string }>> {
    const result = await this.devicesService.rotateToken(+id);
    return {
      data: result,
      message:
        'Device token rotated successfully. Store this token securely — it will not be shown again.',
    };
  }

  @Post(':id/revoke-token')
  @RequirePermissions('devices.update')
  async revokeToken(@Param('id') id: string): Promise<BaseResponse<null>> {
    await this.devicesService.revokeToken(+id);
    return {
      data: null,
      message: 'Device token revoked successfully',
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(+id);
  }
}
