import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthLoginResponse } from './response/auth-login.response';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthRefreshDto } from './dto/auth-refresh.dto';
import { AuthLogoutDto } from './dto/auth-logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() request: AuthLoginDto): Promise<AuthLoginResponse> {
    return await this.authService.login(request);
  }

  @Post('register')
  async register(@Body() request: AuthRegisterDto): Promise<AuthLoginResponse> {
    return await this.authService.register(request);
  }

  @Post('refresh')
  async refresh(@Body() request: AuthRefreshDto) {
    return await this.authService.refreshTokens(request.refreshToken);
  }

  @Post('logout')
  async logout(@Body() request: AuthLogoutDto) {
    await this.authService.logout(request.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
