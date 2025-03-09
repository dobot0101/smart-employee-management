import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

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
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
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

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('서비스가 정의되어 있어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('유효한 자격 증명으로 사용자를 반환해야 함', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: '테스트 사용자',
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');
      
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    });

    it('잘못된 비밀번호로 null을 반환해야 함', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: '테스트 사용자',
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');
      
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      expect(result).toBeNull();
    });

    it('존재하지 않는 사용자로 null을 반환해야 함', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');
      
      expect(usersService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('로그인 성공 시 액세스 토큰을 반환해야 함', async () => {
      
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '테스트 사용자',
        role: 'EMPLOYEE',
      };

      const result = await service.login(user);
      
      expect(jwtService.sign).toHaveBeenCalledWith({ 
        sub: user.id, 
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({ access_token: 'test-token' });
    });
  });
}); 