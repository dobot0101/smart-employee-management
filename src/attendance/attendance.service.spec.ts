import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceQueryDto, AttendanceStatsQueryDto, AttendanceStatus, UpdateAttendanceDto } from './dto/attendance.dto';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: MockRepository<Attendance>;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    attendanceRepository = module.get<MockRepository<Attendance>>(
      getRepositoryToken(Attendance),
    );
    userRepository = module.get<MockRepository<User>>(
      getRepositoryToken(User),
    );
  });

  it('서비스가 정의되어 있어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('직원이 존재하지 않을 경우 오류를 발생시켜야 함', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('이미 오늘 출근 체크한 경우 오류를 발생시켜야 함', async () => {
      const today = new Date();
      const user = { id: 'user-id', name: 'Test User' };
      
      userRepository.findOne.mockResolvedValue(user);
      attendanceRepository.findOne.mockResolvedValue({
        id: 'attendance-id',
        employeeId: 'user-id',
        checkInTime: today,
      });

      await expect(service.checkIn('user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('출근 체크 성공 시 새로운 출결 기록을 생성해야 함', async () => {
      const user = { id: 'user-id', name: 'Test User' };
      const newAttendance = {
        id: 'attendance-id',
        employeeId: 'user-id',
        checkInTime: new Date(),
        status: AttendanceStatus.PRESENT,
      };
      
      userRepository.findOne.mockResolvedValue(user);
      attendanceRepository.findOne.mockResolvedValue(null);
      attendanceRepository.create.mockReturnValue(newAttendance);
      attendanceRepository.save.mockResolvedValue(newAttendance);

      const result = await service.checkIn('user-id');
      
      expect(attendanceRepository.create).toHaveBeenCalled();
      expect(attendanceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newAttendance);
    });
  });

  describe('checkOut', () => {
    it('직원이 존재하지 않을 경우 오류를 발생시켜야 함', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('오늘 출근 기록이 없을 경우 오류를 발생시켜야 함', async () => {
      const user = { id: 'user-id', name: 'Test User' };
      
      userRepository.findOne.mockResolvedValue(user);
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut('user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이미 퇴근 처리된 경우 오류를 발생시켜야 함', async () => {
      const user = { id: 'user-id', name: 'Test User' };
      const attendance = {
        id: 'attendance-id',
        employeeId: 'user-id',
        checkInTime: new Date(),
        checkOutTime: new Date(),
      };
      
      userRepository.findOne.mockResolvedValue(user);
      attendanceRepository.findOne.mockResolvedValue(attendance);

      await expect(service.checkOut('user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('퇴근 체크 성공 시 출결 기록을 업데이트해야 함', async () => {
      const user = { id: 'user-id', name: 'Test User' };
      const checkInTime = new Date();
      checkInTime.setHours(9, 0, 0);
      
      const attendance = {
        id: 'attendance-id',
        employeeId: 'user-id',
        checkInTime,
        checkOutTime: null,
        status: AttendanceStatus.PRESENT,
      };
      
      const updatedAttendance = {
        ...attendance,
        checkOutTime: new Date(),
        workHours: 8,
      };
      
      userRepository.findOne.mockResolvedValue(user);
      attendanceRepository.findOne.mockResolvedValue(attendance);
      attendanceRepository.save.mockResolvedValue(updatedAttendance);

      const result = await service.checkOut('user-id');
      
      expect(attendanceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedAttendance);
    });
  });

  describe('getEmployeeAttendance', () => {
    it('페이지네이션된 출결 기록을 반환해야 함', async () => {
      const query: AttendanceQueryDto = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        page: 1,
        limit: 10,
      };
      
      const attendances = [
        { id: 'attendance-1', employeeId: 'user-id', checkInTime: new Date() },
        { id: 'attendance-2', employeeId: 'user-id', checkInTime: new Date() },
      ];
      
      attendanceRepository.findAndCount.mockResolvedValue([attendances, 2]);

      const result = await service.getEmployeeAttendance('user-id', query);
      
      expect(attendanceRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(attendances);
      expect(result.meta.total).toEqual(2);
      expect(result.meta.page).toEqual(1);
      expect(result.meta.limit).toEqual(10);
      expect(result.meta.totalPages).toEqual(1);
    });
  });

  describe('getAttendanceStats', () => {
    it('출결 통계를 반환해야 함', async () => {
      const query: AttendanceStatsQueryDto = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      };
      
      const attendances = [
        { 
          id: 'attendance-1', 
          employeeId: 'user-id', 
          checkInTime: new Date(),
          status: AttendanceStatus.PRESENT,
          workHours: 8
        },
        { 
          id: 'attendance-2', 
          employeeId: 'user-id', 
          checkInTime: new Date(),
          status: AttendanceStatus.LATE,
          workHours: 7.5
        },
      ];
      
      // Mock find 메서드 결과 설정
      attendanceRepository.find.mockResolvedValue(attendances);
      
      const mockStats = [
        { date: '2023-01-01', totalPresent: 5, totalLate: 2, totalAbsent: 1 },
      ];
      
      const queryBuilder = attendanceRepository.createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockStats);

      const result = await service.getAttendanceStats(query);
      
      expect(attendanceRepository.find).toHaveBeenCalled();
      expect(attendanceRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toHaveProperty('totalDays');
      expect(result).toHaveProperty('presentDays');
      expect(result).toHaveProperty('lateDays');
    });
  });

  describe('updateAttendance', () => {
    it('출결 기록이 존재하지 않을 경우 오류를 발생시켜야 함', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAttendance('non-existent-id', { status: AttendanceStatus.LATE }),
      ).rejects.toThrow(NotFoundException);
    });

    it('출결 기록을 성공적으로 업데이트해야 함', async () => {
      const checkInTime = new Date();
      const attendance = {
        id: 'attendance-id',
        employeeId: 'user-id',
        checkInTime,
        status: AttendanceStatus.PRESENT,
      };
      
      const updateDto: UpdateAttendanceDto = {
        status: AttendanceStatus.LATE,
        note: '교통 체증으로 인한 지각',
        checkInTime: checkInTime.toISOString(),
      };
      
      const updatedAttendance = {
        ...attendance,
        status: AttendanceStatus.LATE,
        note: '교통 체증으로 인한 지각',
        checkInTime,
      };
      
      attendanceRepository.findOne.mockResolvedValue(attendance);
      attendanceRepository.save.mockResolvedValue(updatedAttendance);

      const result = await service.updateAttendance('attendance-id', updateDto);
      
      expect(attendanceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedAttendance);
    });
  });
}); 