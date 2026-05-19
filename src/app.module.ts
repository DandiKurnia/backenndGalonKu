import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/strategies/jwt.srategy';
import { PrismaService } from './common/prisma/prisma.service';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProfileModule } from './profile/profile.module';
import { DevicesModule } from './devices/devices.module';
import { QrcodeService } from './qrcode/qrcode.service';
import { QrcodeModule } from './qrcode/qrcode.module';
import { AddressModule } from './address/address.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    PermissionsModule,
    ProfileModule,
    DevicesModule,
    QrcodeModule,
    AddressModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, PrismaService, QrcodeService],
})
export class AppModule {}
