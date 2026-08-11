import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Res,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 3600_000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user (sets an httpOnly session cookie)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.login(loginDto);

    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get<string>('COOKIE_SECURE', 'false') === 'true',
      maxAge: this.configService.get<number>('COOKIE_MAX_AGE_MS', COOKIE_MAX_AGE),
      path: '/',
    });

    return { user };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout user (clears the session cookie)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiCookieAuth(COOKIE_NAME)
  @ApiBearerAuth()
  async getProfile(@Request() req: ExpressRequest) {
    const { id } = req.user as { id: string };
    return this.usersService.findOne(id);
  }
}