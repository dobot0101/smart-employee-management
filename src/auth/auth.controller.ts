import { Controller, Post, Body, UseGuards, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminProfile() {
    return { message: 'Admin profile' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('manager')
  @Roles(Role.MANAGER, Role.ADMIN)
  getManagerProfile() {
    return { message: 'Manager profile' };
  }
} 