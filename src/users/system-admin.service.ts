import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class SystemAdminService {
  private readonly logger = new Logger(SystemAdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async ensureSystemAdminExists() {
    const adminExists = await this.userRepository.findOne({
      where: { role: Role.ADMIN }
    });

    if (!adminExists) {
      const adminEmail = process.env.SYSTEM_ADMIN_EMAIL || 'admin@system.com';
      const adminPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'admin123!@#';
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const systemAdmin = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: Role.ADMIN,
        isPasswordChanged: false,
        isActive: true
      });

      await this.userRepository.save(systemAdmin);
      
      this.logger.log(`시스템 관리자 계정이 생성되었습니다. 이메일: ${adminEmail}`);
      this.logger.warn('첫 로그인 후 즉시 시스템 관리자 비밀번호를 변경해주세요!');
    }
  }
} 