import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('admin')
  @Roles(Role.ADMIN)
  async createCompanyAdmin(@Body() createAdminDto: CreateAdminDto) {
    const temporaryPassword = this.generateTemporaryPassword();
    const admin = await this.usersService.createAdmin(
      createAdminDto,
      temporaryPassword
    );

    // 이메일로 임시 비밀번호 전송 로직 추가

    return {
      message: 'Company admin created successfully',
      adminId: admin.id,
    };
  }

  private generateTemporaryPassword(): string {
    // 대문자, 소문자, 숫자, 특수문자를 포함한 12자리 비밀번호 생성
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    const allChars = uppercase + lowercase + numbers + symbols;

    // 최소 요구사항을 만족하도록 각 문자 종류별로 하나씩 선택
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // 나머지 8자리는 무작위로 선택
    for (let i = 0; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // 문자열을 무작위로 섞기
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}