import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto, UpdateEmployeeDto, ChangePasswordDto } from '../types/employee.types';

// bcrypt mock
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('EmployeesService', () => {
  let service: EmployeesService;
  let userRepository: MockRepository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    userRepository = module.get<MockRepository<User>>(
      getRepositoryToken(User),
    );
    jwtService = module.get<JwtService>(JwtService);
  });

  it('서비스가 정의되어 있어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('유효한 자격 증명으로 로그인해야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        password: 'hashedPassword',
        name: '직원',
        role: Role.EMPLOYEE,
        isActive: true,
        isPasswordChanged: true,
      };

      userRepository.findOne.mockResolvedValue(employee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('employee@example.com', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'employee@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: employee.id,
        email: employee.email,
        role: employee.role,
      });
      expect(userRepository.update).toHaveBeenCalledWith(employee.id, {
        lastLoginAt: expect.any(Date),
      });
      expect(result).toEqual({
        access_token: 'test-token',
        isPasswordChanged: true,
      });
    });

    it('비활성화된 계정으로 로그인 시 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        password: 'hashedPassword',
        isActive: false,
      };

      userRepository.findOne.mockResolvedValue(employee);

      await expect(service.login('employee@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('잘못된 비밀번호로 로그인 시 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        password: 'hashedPassword',
        isActive: true,
      };

      userRepository.findOne.mockResolvedValue(employee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('employee@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('비밀번호를 성공적으로 변경해야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        password: 'hashedPassword',
      };

      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'currentPassword',
        newPassword: 'newPassword',
      };

      userRepository.findOne.mockResolvedValue(employee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.changePassword('employee-id', changePasswordDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'employee-id' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('currentPassword', 'hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(userRepository.update).toHaveBeenCalledWith('employee-id', {
        password: 'hashedPassword',
        isPasswordChanged: true,
      });
      expect(result).toEqual({ message: '비밀번호가 성공적으로 변경되었습니다' });
    });

    it('현재 비밀번호가 잘못된 경우 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        password: 'hashedPassword',
      };

      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword',
      };

      userRepository.findOne.mockResolvedValue(employee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword('employee-id', changePasswordDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAllEmployees', () => {
    it('관리자가 모든 직원 목록을 조회해야 함', async () => {
      const admin = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      const employees = [
        {
          id: 'employee-1',
          email: 'employee1@example.com',
          name: '직원1',
          role: Role.EMPLOYEE,
        },
        {
          id: 'employee-2',
          email: 'employee2@example.com',
          name: '직원2',
          role: Role.MANAGER,
        },
      ];

      userRepository.findOne.mockResolvedValue(admin);
      userRepository.find.mockResolvedValue(employees);

      const result = await service.getAllEmployees('admin-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-id' },
      });
      expect(userRepository.find).toHaveBeenCalled();
      expect(result).toEqual(employees);
    });

    it('관리자가 아닌 사용자가 조회 시 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        role: Role.EMPLOYEE,
      };

      userRepository.findOne.mockResolvedValue(employee);

      await expect(service.getAllEmployees('employee-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateEmployee', () => {
    it('관리자가 직원 정보를 업데이트해야 함', async () => {
      const admin = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      const updateEmployeeDto: UpdateEmployeeDto = {
        name: '업데이트된 직원',
        role: Role.EMPLOYEE,
      };

      userRepository.findOne.mockResolvedValue(admin);
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateEmployee('employee-id', updateEmployeeDto, 'admin-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-id' },
      });
      expect(userRepository.update).toHaveBeenCalledWith('employee-id', updateEmployeeDto);
      expect(result).toEqual({ message: '직원 정보가 성공적으로 업데이트되었습니다' });
    });

    it('관리자가 아닌 사용자가 업데이트 시 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        role: Role.EMPLOYEE,
      };

      const updateEmployeeDto: UpdateEmployeeDto = {
        name: '업데이트된 직원',
      };

      userRepository.findOne.mockResolvedValue(employee);

      await expect(service.updateEmployee('other-employee-id', updateEmployeeDto, 'employee-id')).rejects.toThrow(UnauthorizedException);
    });

    it('역할을 관리자로 변경하려고 할 때 오류를 발생시켜야 함', async () => {
      const admin = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      const updateEmployeeDto: UpdateEmployeeDto = {
        role: Role.ADMIN,
      };

      userRepository.findOne.mockResolvedValue(admin);

      await expect(service.updateEmployee('employee-id', updateEmployeeDto, 'admin-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('registerEmployee', () => {
    it('관리자가 직원을 등록해야 함', async () => {
      const admin = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      const createEmployeeDto: CreateEmployeeDto = {
        email: 'newemployee@example.com',
        name: '새 직원',
        role: Role.EMPLOYEE,
        password: 'password123',
      };

      const newEmployee = {
        id: 'new-employee-id',
        ...createEmployeeDto,
        password: 'hashedPassword',
      };

      userRepository.findOne.mockResolvedValue(admin);
      userRepository.create.mockReturnValue(newEmployee);
      userRepository.save.mockResolvedValue(newEmployee);

      const result = await service.registerEmployee(createEmployeeDto, 'admin-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-id' },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...createEmployeeDto,
        password: 'hashedPassword',
      }));
      expect(userRepository.save).toHaveBeenCalledWith(newEmployee);
      expect(result).toHaveProperty('message', '직원이 성공적으로 등록되었습니다');
      expect(result).toHaveProperty('temporaryPassword');
    });

    it('관리자가 아닌 사용자가 관리자 계정을 생성하려고 할 때 오류를 발생시켜야 함', async () => {
      const manager = {
        id: 'manager-id',
        email: 'manager@example.com',
        role: Role.MANAGER,
      };

      const createEmployeeDto: CreateEmployeeDto = {
        email: 'newadmin@example.com',
        name: '새 관리자',
        role: Role.ADMIN,
        password: 'password123',
      };

      userRepository.findOne.mockResolvedValue(manager);

      await expect(service.registerEmployee(createEmployeeDto, 'manager-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getManagedEmployees', () => {
    it('관리자가 모든 비관리자 직원을 조회해야 함', async () => {
      const admin = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      const employees = [
        {
          id: 'employee-1',
          email: 'employee1@example.com',
          name: '직원1',
          role: Role.EMPLOYEE,
        },
        {
          id: 'manager-1',
          email: 'manager1@example.com',
          name: '매니저1',
          role: Role.MANAGER,
        },
      ];

      userRepository.findOne.mockResolvedValue(admin);
      userRepository.find.mockResolvedValue(employees);

      const result = await service.getManagedEmployees('admin-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-id' },
      });
      expect(userRepository.find).toHaveBeenCalled();
      expect(result).toEqual(employees);
    });

    it('매니저가 일반 직원만 조회해야 함', async () => {
      const manager = {
        id: 'manager-id',
        email: 'manager@example.com',
        role: Role.MANAGER,
      };

      const employees = [
        {
          id: 'employee-1',
          email: 'employee1@example.com',
          name: '직원1',
          role: Role.EMPLOYEE,
        },
      ];

      userRepository.findOne.mockResolvedValue(manager);
      userRepository.find.mockResolvedValue(employees);

      const result = await service.getManagedEmployees('manager-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'manager-id' },
      });
      expect(userRepository.find).toHaveBeenCalled();
      expect(result).toEqual(employees);
    });

    it('일반 직원이 조회 시 오류를 발생시켜야 함', async () => {
      const employee = {
        id: 'employee-id',
        email: 'employee@example.com',
        role: Role.EMPLOYEE,
      };

      userRepository.findOne.mockResolvedValue(employee);

      await expect(service.getManagedEmployees('employee-id')).rejects.toThrow(UnauthorizedException);
    });
  });
}); 