import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QrcodeService } from 'src/qrcode/qrcode.service';
import { DeviceStatus } from 'src/common/enum/device-status';
import { Device } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrcodeService: QrcodeService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto) {
    return await this.prisma.$transaction(async (prisma) => {
      const address = await prisma.address.findUnique({
        where: { id: createDeviceDto.address_id },
      });

      if (!address) {
        throw new BadRequestException('Address not found');
      }

      const name = await prisma.device.findFirst({
        where: {
          name: createDeviceDto.name,
          addressId: createDeviceDto.address_id,
        },
      });

      if (name) {
        throw new BadRequestException('Name already exists at this address');
      }

      const device = await prisma.device.create({
        data: {
          addressId: createDeviceDto.address_id,
          name: createDeviceDto.name,
          status: DeviceStatus.ACTIVE,
          lastActive: new Date(),
        },
      });

      const deviceCode = `DEV-${device.id}`;

      let qrcodeImagePath: string | null = null;
      try {
        qrcodeImagePath = await this.qrcodeService.generateQrCode(deviceCode);
      } catch (error) {
        console.log(`Failed to generate QR Code:`, error);
        throw new BadRequestException('Failed to generate QR Code');
      }
      const updatedDevice = await prisma.device.update({
        where: { id: device.id },
        data: {
          deviceCode: deviceCode,
          qrCodeUrl: qrcodeImagePath,
        },
      });

      return updatedDevice;
    });
  }

  async findAll(userId: number): Promise<Device[]> {
    const userHasRole = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (userHasRole?.role.key === 'operator') {
      if (!userHasRole.addressId) return [];

      return await this.prisma.device.findMany({
        where: {
          addressId: userHasRole.addressId,
        },
        include: {
          address: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });
    } else {
      return await this.prisma.device.findMany({
        include: {
          address: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });
    }
  }

  async findOne(id: number, userId: number): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { id: id },
      include: {
        address: true,
      },
    });
    if (!device) {
      throw new BadRequestException('Device not found');
    }

    const userHasRole = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (userHasRole?.role.key === 'operator') {
      if (!userHasRole.addressId)
        throw new BadRequestException('Address not found');

      if (device.addressId !== userHasRole.addressId) {
        throw new BadRequestException('Device not found');
      }

      return (await this.prisma.device.findUnique({
        where: {
          id: id,
        },
        include: {
          address: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      }))!;
    } else {
      return (await this.prisma.device.findUnique({
        where: {
          id: id,
        },
        include: {
          address: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      }))!;
    }
  }

  async update(id: number, createDeviceDto: CreateDeviceDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: createDeviceDto.address_id },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }

    const currentDevice = await this.prisma.device.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentDevice) {
      throw new BadRequestException('Device not found');
    }

    const currentStatus = currentDevice.status as unknown as DeviceStatus;

    const newStatus = (() => {
      if (currentStatus === DeviceStatus.ACTIVE) {
        return DeviceStatus.INACTIVE;
      } else {
        return DeviceStatus.ACTIVE;
      }
    })();

    const device = await this.prisma.device.update({
      where: { id },
      data: {
        addressId: createDeviceDto.address_id,
        name: createDeviceDto.name,
        status: newStatus,
      },
    });

    return device;
  }

  async findByCode(deviceCode: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { deviceCode: deviceCode },
      include: {
        address: true,
      },
    });

    if (!device) {
      throw new BadRequestException('Device not found or invalid QR Code');
    }

    return device;
  }

  remove(id: number) {
    return `This action removes a #${id} device`;
  }
}
