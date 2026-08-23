import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { Permission } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/legged-in.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiTags('Permissions')
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  async findAll(): Promise<BaseResponse<Permission[]>> {
    const result = await this.permissionsService.findAll();
    return {
      message: 'Permission fetched successfully',
      data: result,
    };
  }
}
