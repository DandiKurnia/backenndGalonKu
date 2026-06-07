import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { verifyDeviceToken } from 'src/common/utils/device-token.util';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const deviceCode = request.headers['x-device-code'] as string | undefined;
    const deviceToken = request.headers['x-device-token'] as
      | string
      | undefined;

    if (!deviceCode || !deviceToken) {
      throw new UnauthorizedException('Missing device credentials');
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceCode },
      select: {
        id: true,
        deviceCode: true,
        deviceTokenHash: true,
        tokenRevokedAt: true,
      },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device');
    }

    if (!device.deviceTokenHash) {
      throw new UnauthorizedException('Device has no token configured');
    }

    if (device.tokenRevokedAt) {
      throw new UnauthorizedException('Device token revoked');
    }

    const isValid = verifyDeviceToken(deviceToken, device.deviceTokenHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid device token');
    }

    // Cross-check: header deviceCode must match param :code if present
    const paramCode = request.params?.code;
    if (paramCode && paramCode !== deviceCode) {
      throw new UnauthorizedException('Device code mismatch');
    }

    // Attach device info to request for downstream use
    request.device = {
      id: device.id,
      deviceCode: device.deviceCode,
    };

    return true;
  }
}
