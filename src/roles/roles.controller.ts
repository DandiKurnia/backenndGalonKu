import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/legged-in.guard';
import { RoleResponse } from '../auth/response/auth-login.response';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('Roles')
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions('roles.read')
  @Get()
  @ApiOperation({ summary: 'List roles with permissions' })
  async findAll(): Promise<BaseResponse<RoleResponse[]>> {
    const roles = await this.rolesService.findAll();
    return {
      message: 'Roles fetched successfully',
      data: roles,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string): Promise<BaseResponse<RoleResponse>> {
    const role = await this.rolesService.findOne(+id);
    return {
      message: `Role fetched by id ${id} successfully`,
      data: role,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permission_ids: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<BaseResponse<RoleResponse>> {
    const role = await this.rolesService.update(+id, updateRoleDto);
    return {
      message: `Role updated by id ${id} successfully`,
      data: role,
    };
  }
}
