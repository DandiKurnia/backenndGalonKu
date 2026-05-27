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
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { Address } from '@prisma/client';

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @RequirePermissions('addresses.create')
  async create(
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<BaseResponse<Address>> {
    return {
      data: await this.addressService.create(createAddressDto),
      message: 'Address created successfully',
    };
  }

  @Get()
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<BaseResponse<Address[]>> {
    return {
      data: await this.addressService.findAll(limit),
      message: 'Addresses retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<BaseResponse<Address>> {
    return {
      data: await this.addressService.findOne(+id),
      message: 'Address retrieved successfully',
    };
  }

  @Patch(':id')
  @RequirePermissions('addresses.update')
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
  async remove(@Param('id') id: string): Promise<BaseResponse<Address>> {
    await this.addressService.remove(+id);
    return {
      data: null,
      message: 'Address removed successfully',
    };
  }
}
