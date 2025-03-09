import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { User } from '../users/entities/user.entity';
import { AttendanceQueryDto, AttendanceStatsQueryDto, AttendanceStatus, UpdateAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 회사 출근 시간 설정 (예: 오전 9시)
  private readonly WORK_START_HOUR = 9;
  private readonly WORK_START_MINUTE = 0;
  
  // 회사 퇴근 시간 설정 (예: 오후 6시)
  private readonly WORK_END_HOUR = 18;
  private readonly WORK_END_MINUTE = 0;

  async checkIn(employeeId: string) {
    // 직원 존재 여부 확인
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('직원을 찾을 수 없습니다.');
    }

    // 오늘 날짜 설정
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 이미 출근 체크했는지 확인
    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        checkInTime: Between(today, tomorrow),
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('이미 오늘 출근 체크를 했습니다.');
    }

    // 현재 시간
    const now = new Date();
    
    // 출근 시간 (9:00)
    const workStartTime = new Date();
    workStartTime.setHours(this.WORK_START_HOUR, this.WORK_START_MINUTE, 0, 0);
    
    // 출결 상태 결정
    let status = AttendanceStatus.PRESENT;
    
    // 지각 여부 확인 (9시 이후 출근)
    if (now > workStartTime) {
      status = AttendanceStatus.LATE;
    }

    // 출근 기록 생성
    const attendance = this.attendanceRepository.create({
      employeeId,
      checkInTime: now,
      status,
    });

    return this.attendanceRepository.save(attendance);
  }

  async checkOut(employeeId: string) {
    // 직원 존재 여부 확인
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('직원을 찾을 수 없습니다.');
    }

    // 오늘 날짜 설정
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘의 출근 기록 조회
    const attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        checkInTime: Between(today, tomorrow),
      },
    });

    if (!attendance) {
      throw new BadRequestException('오늘 출근 기록이 없습니다.');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('이미 퇴근 처리가 되었습니다.');
    }

    // 현재 시간
    const now = new Date();
    
    // 퇴근 시간 (18:00)
    const workEndTime = new Date();
    workEndTime.setHours(this.WORK_END_HOUR, this.WORK_END_MINUTE, 0, 0);
    
    // 조퇴 여부 확인 및 상태 업데이트
    if (now < workEndTime && attendance.status === AttendanceStatus.PRESENT) {
      attendance.status = AttendanceStatus.HALF_DAY;
    }

    // 근무 시간 계산 (소수점 둘째 자리까지)
    const workHours = parseFloat(
      ((now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );

    // 퇴근 기록 업데이트
    attendance.checkOutTime = now;
    attendance.workHours = workHours;

    return this.attendanceRepository.save(attendance);
  }

  async getEmployeeAttendance(employeeId: string, query: AttendanceQueryDto) {
    const { startDate, endDate, page = 1, limit = 10 } = query;
    
    // 날짜 필터링 조건 설정
    const dateFilter: FindOptionsWhere<Attendance> = { employeeId };
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter.checkInTime = Between(start, end);
    }

    // 페이지네이션 설정
    const skip = (page - 1) * limit;
    
    // 출퇴근 기록 조회
    const [attendances, total] = await this.attendanceRepository.findAndCount({
      where: dateFilter,
      order: { checkInTime: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: attendances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAttendanceStats(query: AttendanceStatsQueryDto) {
    const { startDate, endDate } = query;
    
    // 날짜 범위 설정
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    // 해당 기간의 모든 출결 기록 조회
    const attendances = await this.attendanceRepository.find({
      where: {
        checkInTime: Between(start, end),
      },
    });
    
    // 기본 통계 계산
    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const lateDays = attendances.filter(a => a.status === AttendanceStatus.LATE).length;
    const halfDays = attendances.filter(a => a.status === AttendanceStatus.HALF_DAY).length;
    const absentDays = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const totalWorkHours = attendances.reduce((sum, a) => sum + (a.workHours || 0), 0);
    
    // 평균 출퇴근 시간 계산
    const checkInTimes = attendances.map(a => a.checkInTime.getTime());
    const avgCheckInTime = new Date(checkInTimes.reduce((sum, time) => sum + time, 0) / totalDays);
    const avgCheckInHour = avgCheckInTime.getHours();
    const avgCheckInMinutes = avgCheckInTime.getMinutes();
    const avgCheckInMinute = Math.floor(avgCheckInMinutes % 60);
    
    const checkOutTimes = attendances
      .filter(a => a.checkOutTime)
      .map(a => a.checkOutTime.getTime());
    const avgCheckOutTime = checkOutTimes.length > 0 
      ? new Date(checkOutTimes.reduce((sum, time) => sum + time, 0) / checkOutTimes.length)
      : null;
    const avgCheckOutHour = avgCheckOutTime ? avgCheckOutTime.getHours() : null;
    const avgCheckOutMinutes = avgCheckOutTime ? avgCheckOutTime.getMinutes() : null;
    const avgCheckOutMinute = avgCheckOutMinutes ? Math.floor(avgCheckOutMinutes % 60) : null;
    
    // 근무 시간 통계
    const workHoursStats = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('DATE(attendance.checkInTime)', 'date')
      .addSelect('AVG(attendance.workHours)', 'avgWorkHours')
      .addSelect('MAX(attendance.workHours)', 'maxWorkHours')
      .addSelect('MIN(attendance.workHours)', 'minWorkHours')
      .where('attendance.checkInTime BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .andWhere('attendance.checkOutTime IS NOT NULL')
      .groupBy('DATE(attendance.checkInTime)')
      .getRawMany();
    
    return {
      totalDays,
      presentDays,
      lateDays,
      halfDays,
      absentDays,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
      avgWorkHours: totalDays > 0 ? parseFloat((totalWorkHours / totalDays).toFixed(2)) : 0,
      avgCheckInTime: avgCheckInHour !== null ? `${avgCheckInHour}:${avgCheckInMinute.toString().padStart(2, '0')}` : null,
      avgCheckOutTime: avgCheckOutHour !== null ? `${avgCheckOutHour}:${avgCheckOutMinute.toString().padStart(2, '0')}` : null,
      workHoursStats,
    };
  }

  async updateAttendance(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('출결 기록을 찾을 수 없습니다.');
    }

    // 업데이트할 필드 적용
    const updatedAttendance = {
      ...attendance,
      ...updateAttendanceDto,
    };

    // checkInTime이 문자열로 들어온 경우 Date 객체로 변환
    if (updateAttendanceDto.checkInTime) {
      updatedAttendance.checkInTime = new Date(updateAttendanceDto.checkInTime);
    }

    // checkOutTime이 문자열로 들어온 경우 Date 객체로 변환
    if (updateAttendanceDto.checkOutTime) {
      updatedAttendance.checkOutTime = new Date(updateAttendanceDto.checkOutTime);
    }

    // 출근 시간이 변경된 경우 상태 재계산
    if (updateAttendanceDto.checkInTime && !updateAttendanceDto.status) {
      const checkInTime = new Date(updateAttendanceDto.checkInTime);
      const workStartTime = new Date(checkInTime);
      workStartTime.setHours(this.WORK_START_HOUR, this.WORK_START_MINUTE, 0, 0);
      
      if (checkInTime > workStartTime) {
        updatedAttendance.status = AttendanceStatus.LATE;
      } else {
        updatedAttendance.status = AttendanceStatus.PRESENT;
      }
    }

    return this.attendanceRepository.save(updatedAttendance);
  }
} 