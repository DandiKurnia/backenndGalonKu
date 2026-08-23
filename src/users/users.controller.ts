import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/legged-in.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { User } from '@prisma/client';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', example: 'jane@example.com' },
        password: { type: 'string', example: 'password123' },
        phone_number: { type: 'string', example: '081234567890' },
        roleId: { type: 'number', example: 2 },
        addressId: { type: 'number', example: 1, nullable: true },
      },
    },
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<BaseResponse<User>> {
    return {
      data: await this.usersService.create(createUserDto),
      message: 'User created successfully',
    };
  }

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users' })
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<BaseResponse<User[]>> {
    return {
      data: await this.usersService.findAll(limit),
      message: 'Users retrieved successfully',
    };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Doe Updated' },
        email: { type: 'string', example: 'jane.updated@example.com' },
        password: { type: 'string', example: 'newpassword123' },
        phone_number: { type: 'string', example: '081234567891' },
        roleId: { type: 'number', example: 2 },
        addressId: { type: 'number', example: 1, nullable: true },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: CreateUserDto,
  ): Promise<BaseResponse<User>> {
    return {
      data: await this.usersService.update(+id, updateUserDto),
      message: 'User updated successfully',
    };
  }
}
