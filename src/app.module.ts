import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtStrategy } from './auth/strategies/jwt.srategy';
import { PrismaService } from './common/prisma/prisma.service';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, PrismaService],
})
export class AppModule {}
