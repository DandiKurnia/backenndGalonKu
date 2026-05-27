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

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
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
