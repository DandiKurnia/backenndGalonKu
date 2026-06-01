import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  AuthLoginResponse,
  UserResponse,
} from './response/auth-login.response';
import { StringValue } from 'ms';
import { AuthRegisterDto } from './dto/auth-register.dto';

type Permission = {
  id: number;
  name: string;
  key: string;
  resource: string;
};

type RolePermission = {
  permission: Permission;
};

type Role = {
  id: number;
  name: string;
  key: string;
  rolePermissions: RolePermission[];
};

type userWithRole = {
  id: number;
  email: string;
  password: string;
  name: string;
  roleId: number;
  role: Role;
};

type JwtUser = {
  id: number;
  email: string;
  name: string;
  roleId: number;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private generateToken(user: JwtUser): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY ?? 'secretKey',
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as StringValue,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRandomToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private async generateTokenPair(
    user: JwtUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateToken(user);
    const rawRefreshToken = this.generateRandomToken();
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private transformUser(user: userWithRole): UserResponse {
    // eslint-disable-next-line
    const { password: _, ...userWithoutPassword } = user;

    const transformedUser: UserResponse = {
      ...userWithoutPassword,

      role: {
        ...user.role,
        permissions: user.role?.rolePermissions?.map(
          (rolePermission: RolePermission) => ({
            id: rolePermission.permission.id,
            name: rolePermission.permission.name,
            key: rolePermission.permission.key,
            resource: rolePermission.permission.resource,
          }),
        ),
      },
    };

    return transformedUser;
  }

  private async buildAuthResponse(
    user: userWithRole,
  ): Promise<AuthLoginResponse> {
    const { accessToken, refreshToken } = await this.generateTokenPair(user);
    const userResponse = this.transformUser(user);

    const authResponse: AuthLoginResponse = {
      accessToken,
      refreshToken,
      user: userResponse,
    };

    return authResponse;
  }

  async login(request: AuthLoginDto): Promise<AuthLoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: request.email,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      request.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return await this.buildAuthResponse(user);
  }

  async register(request: AuthRegisterDto): Promise<AuthLoginResponse> {
    const exitingUser = await this.prisma.user.findUnique({
      where: {
        email: request.email,
      },
    });

    if (exitingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const role = await this.prisma.role.findFirst({
      where: { key: 'customer' },
    });

    if (!role) {
      throw new UnauthorizedException('Role not found');
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: request.email,
        password: hashedPassword,
        name: request.name,
        phoneNumber: request.phone_number,
        roleId: role.id,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return await this.buildAuthResponse(user);
  }
}
