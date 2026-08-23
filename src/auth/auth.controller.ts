import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthLoginResponse } from './response/auth-login.response';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthRefreshDto } from './dto/auth-refresh.dto';
import { AuthLogoutDto } from './dto/auth-logout.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'superadmin@mail.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async login(@Body() request: AuthLoginDto): Promise<AuthLoginResponse> {
    return await this.authService.login(request);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new customer' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'John Doe' },
        phone_number: { type: 'string', example: '081234567890' },
      },
    },
  })
  async register(@Body() request: AuthRegisterDto): Promise<AuthLoginResponse> {
    return await this.authService.register(request);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'dtkn_abc123456789' },
      },
    },
  })
  async refresh(@Body() request: AuthRefreshDto) {
    return await this.authService.refreshTokens(request.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user / invalidate refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'dtkn_abc123456789' },
      },
    },
  })
  async logout(@Body() request: AuthLogoutDto) {
    await this.authService.logout(request.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
