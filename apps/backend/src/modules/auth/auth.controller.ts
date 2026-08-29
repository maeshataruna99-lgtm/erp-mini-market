import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login dan dapatkan JWT' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token menggunakan refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout dan revoke refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto);
    return { message: 'Logout berhasil' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil user yang sedang login' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daftar user (ADMIN/MANAGER)' })
  listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buat user baru (ADMIN)' })
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }
}
