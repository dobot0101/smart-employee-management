import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async createAdmin(createAdminDto: CreateAdminDto, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.usersRepository.create({
      ...createAdminDto,
      password: hashedPassword,
      role: Role.ADMIN
    });
    return this.usersRepository.save(admin);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }


} 