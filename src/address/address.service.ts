import { OpenCageService } from './../common/opencage/opencage.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Address } from '@prisma/client';

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private openCageService: OpenCageService,
  ) {}

  private async getCoordinates(
    address: string,
  ): Promise<{ lat: number; lng: number }> {
    return await this.openCageService.geocode(address);
  }

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    const { lat, lng } =
      createAddressDto.latitude !== undefined &&
      createAddressDto.longitude !== undefined
        ? { lat: createAddressDto.latitude, lng: createAddressDto.longitude }
        : await this.getCoordinates(createAddressDto.address);

    return this.prisma.address.create({
      data: {
        name: createAddressDto.name,
        address: createAddressDto.address,
        latitude: lat,
        longitude: lng,
      },
    });
  }

  async findAll(limit?: number): Promise<Address[]> {
    return this.prisma.address.findMany({
      ...(limit && limit > 0 ? { take: limit } : {}),
      include: {
        devices: {
          select: {
            name: true,
            status: true,
          },
        },
      },
    });
  }

  async findOne(id: number): Promise<Address> {
    const address = await this.prisma.address.findUnique({
      where: {
        id: id,
      },
      include: {
        devices: {
          select: {
            name: true,
            status: true,
          },
        },
      },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }

    return address;
  }

  async update(
    id: number,
    updateAddressDto: CreateAddressDto,
  ): Promise<Address> {
    const address = await this.prisma.address.findUnique({
      where: {
        id: id,
      },
    });
    if (!address) {
      throw new BadRequestException('Address not found');
    }
    const { lat, lng } =
      updateAddressDto.latitude !== undefined &&
      updateAddressDto.longitude !== undefined
        ? { lat: updateAddressDto.latitude, lng: updateAddressDto.longitude }
        : await this.getCoordinates(updateAddressDto.address);

    return this.prisma.address.update({
      where: {
        id: id,
      },
      data: {
        name: updateAddressDto.name,
        address: updateAddressDto.address,
        latitude: lat,
        longitude: lng,
      },
    });
  }

  async remove(id: number): Promise<void> {
    const address = await this.prisma.address.findUnique({
      where: {
        id: id,
      },
    });
    if (!address) {
      throw new BadRequestException('Address not found');
    }
    await this.findOne(id);
    await this.prisma.address.delete({
      where: {
        id: id,
      },
    });
  }
}
