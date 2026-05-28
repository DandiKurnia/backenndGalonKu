import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
        phoneNumber: createUserDto.phone_number,
        roleId: createUserDto.roleId,
        addressId: createUserDto.addressId,
      },
    });

    return user;
  }

  async findAll(limit?: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        roleId: {
          in: [1, 3],
        },
      },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });
  }

  async update(id: number, updateUserDto: CreateUserDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.prisma.user.update({
      where: { id: id },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password: updateUserDto.password,
        phoneNumber: updateUserDto.phone_number,
        roleId: updateUserDto.roleId,
        addressId: updateUserDto.addressId,
      },
    });
  }
}
