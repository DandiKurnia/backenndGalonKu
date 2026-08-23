import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export type SafeUser = Omit<User, 'password'>;

function excludePassword(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;
  return safeUser;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const email = await this.prisma.user.findFirst({
      where: { email: createUserDto.email },
    });
    if (email) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        phoneNumber: createUserDto.phone_number,
        roleId: createUserDto.roleId,
        addressId: createUserDto.addressId,
      },
    });

    return excludePassword(user);
  }

  async findAll(limit?: number): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        roleId: {
          in: [1, 3],
        },
      },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });
    return users.map(excludePassword);
  }

  async update(id: number, updateUserDto: CreateUserDto): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    const updated = await this.prisma.user.update({
      where: { id: id },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password: hashedPassword,
        phoneNumber: updateUserDto.phone_number,
        roleId: updateUserDto.roleId,
        addressId: updateUserDto.addressId,
      },
    });
    return excludePassword(updated);
  }
}
