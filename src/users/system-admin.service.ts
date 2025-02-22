import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemAdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async ensureSystemAdminExists() {
    const existingAdmin = await this.userRepository.findOne({
      where: { role: Role.SUPER_ADMIN }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      
      await this.userRepository.save({
        email: 'admin@system.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: Role.SUPER_ADMIN,
        isActive: true
      });

      console.log('System admin account created successfully');
    }
  }
} 