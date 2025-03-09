import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Role } from '../common/enums/role.enum';

// bcrypt mock
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<MockRepository<User>>(
      getRepositoryToken(User),
    );
  });

  it('서비스가 정의되어 있어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('createAdmin', () => {
    it('새로운 관리자를 생성해야 함', async () => {
      const createAdminDto: CreateAdminDto = {
        email: 'admin@example.com',
        name: '관리자',
        companyName: '테스트 회사',
      };

      const password = 'admin123';

      const newAdmin = {
        id: 'admin-id',
        ...createAdminDto,
        password: 'hashedPassword',
        role: Role.ADMIN,
      };

      userRepository.create.mockReturnValue(newAdmin);
      userRepository.save.mockResolvedValue(newAdmin);

      const result = await service.createAdmin(createAdminDto, password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createAdminDto,
        password: 'hashedPassword',
        role: Role.ADMIN,
      });
      expect(userRepository.save).toHaveBeenCalledWith(newAdmin);
      expect(result).toEqual(newAdmin);
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾아야 함', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        name: '테스트 사용자',
        password: 'hashedPassword',
      };

      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('존재하지 않는 이메일로 null을 반환해야 함', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });
  });
}); 