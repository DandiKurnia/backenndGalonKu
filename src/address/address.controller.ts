import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from 'src/auth/guards/legged-in.guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { Address } from '@prisma/client';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@Controller('address')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('Address')
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @RequirePermissions('addresses.create')
  @ApiOperation({ summary: 'Create address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Main Office' },
        address: { type: 'string', example: 'Jl. Sudirman No. 1, Jakarta' },
        latitude: { type: 'number', example: -6.2088, nullable: true },
        longitude: { type: 'number', example: 106.8456, nullable: true },
      },
    },
  })
  async create(
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<BaseResponse<Address>> {
    return {
      data: await this.addressService.create(createAddressDto),
      message: 'Address created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List addresses' })
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<BaseResponse<Address[]>> {
    return {
      data: await this.addressService.findAll(limit),
      message: 'Addresses retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  async findOne(@Param('id') id: string): Promise<BaseResponse<Address>> {
    return {
      data: await this.addressService.findOne(+id),
      message: 'Address retrieved successfully',
    };
  }

  @Patch(':id')
  @RequirePermissions('addresses.update')
  @ApiOperation({ summary: 'Update address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Office' },
        address: { type: 'string', example: 'Jl. Thamrin No. 10, Jakarta' },
        latitude: { type: 'number', example: -6.1951, nullable: true },
        longitude: { type: 'number', example: 106.8229, nullable: true },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateAddressDto: CreateAddressDto,
  ): Promise<BaseResponse<Address>> {
    return {
      data: await this.addressService.update(+id, updateAddressDto),
      message: 'Address updated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('addresses.delete')
  @ApiOperation({ summary: 'Delete address' })
  async remove(@Param('id') id: string): Promise<BaseResponse<Address>> {
    await this.addressService.remove(+id);
    return {
      data: null,
      message: 'Address removed successfully',
    };
  }
}
