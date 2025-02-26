import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateEmployeeDto, UpdateEmployeeDto, ChangePasswordDto } from '../types/employee.types';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import { Not } from 'typeorm';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const employee = await this.usersRepository.findOne({ where: { email } });
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('유효하지 않은 인증 정보입니다');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('유효하지 않은 인증 정보입니다');
    }

    const payload = { 
      sub: employee.id, 
      email: employee.email, 
      role: employee.role 
    };

    await this.usersRepository.update(employee.id, {
      lastLoginAt: new Date()
    });

    return {
      access_token: this.jwtService.sign(payload),
      isPasswordChanged: employee.isPasswordChanged
    };
  }

  async changePassword(employeeId: string, changePasswordDto: ChangePasswordDto) {
    const employee = await this.usersRepository.findOne({ where: { id: employeeId } });
    
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      employee.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');
    }

    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    
    await this.usersRepository.update(employeeId, {
      password: hashedNewPassword,
      isPasswordChanged: true
    });

    return { message: '비밀번호가 성공적으로 변경되었습니다' };
  }

  async getAllEmployees(adminId: string) {
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (admin.role !== Role.ADMIN) {
      throw new UnauthorizedException('관리자만 모든 직원을 조회할 수 있습니다');
    }

    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt']
    });
  }

  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto, adminId: string) {
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (admin.role !== Role.ADMIN) {
      throw new UnauthorizedException('관리자만 직원 정보를 수정할 수 있습니다');
    }

    if (updateEmployeeDto.role === Role.ADMIN) {
      throw new BadRequestException('역할을 관리자로 변경할 수 없습니다');
    }

    await this.usersRepository.update(id, updateEmployeeDto);
    return { message: '직원 정보가 성공적으로 업데이트되었습니다' };
  }

  private generateTemporaryPassword(): string {
    return Math.random().toString(36).slice(-8);
  }

  async registerEmployee(createEmployeeDto: CreateEmployeeDto, creatorId: string) {
    const creator = await this.usersRepository.findOne({ where: { id: creatorId } });
    
    if (creator.role === Role.ADMIN) {
      if (createEmployeeDto.role === Role.ADMIN) {
        throw new BadRequestException('API를 통해 추가 관리자 계정을 생성할 수 없습니다');
      }
    } 
    else if (creator.role === Role.MANAGER) {
      if (createEmployeeDto.role !== Role.EMPLOYEE) {
        throw new BadRequestException('매니저는 일반 직원만 생성할 수 있습니다');
      }
    } else {
      throw new UnauthorizedException('관리자와 매니저만 직원을 등록할 수 있습니다');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const employee = this.usersRepository.create({
      ...createEmployeeDto,
      password: hashedPassword,
    });

    await this.usersRepository.save(employee);

    return { 
      message: '직원이 성공적으로 등록되었습니다',
      temporaryPassword
    };
  }

  async getManagedEmployees(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (user.role === Role.ADMIN) {
      return this.usersRepository.find({
        where: { role: Not(Role.ADMIN) },
        select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt']
      });
    } 
    else if (user.role === Role.MANAGER) {
      return this.usersRepository.find({
        where: { role: Role.EMPLOYEE },
        select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt']
      });
    }
    
    throw new UnauthorizedException('관리자와 매니저만 직원 목록을 조회할 수 있습니다');
  }
} 