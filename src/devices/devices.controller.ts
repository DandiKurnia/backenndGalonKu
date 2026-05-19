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
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { JwtAuthGuard } from 'src/auth/guards/legged-in.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { Device } from '@prisma/client';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermissions('device.create')
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
  ): Promise<BaseResponse<Device>> {
    const result = await this.devicesService.create(createDeviceDto);
    return {
      data: result,
      message: 'Device created successfully',
    };
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: { id: number } },
  ): Promise<BaseResponse<Device[]>> {
    return {
      data: await this.devicesService.findAll(req.user.id),
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
  @RequirePermissions('device.update')
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(+id);
  }
}
