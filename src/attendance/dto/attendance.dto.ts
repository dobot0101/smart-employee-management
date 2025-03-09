import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
}

export class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: '조회 시작일 (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: '조회 종료일 (YYYY-MM-DD)' })
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ required: false, description: '페이지 번호', default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ required: false, description: '페이지당 항목 수', default: 10 })
  limit?: number = 10;
}

export class AttendanceStatsQueryDto {
  @IsDateString()
  @ApiProperty({ description: '통계 시작일 (YYYY-MM-DD)' })
  startDate: string;

  @IsDateString()
  @ApiProperty({ description: '통계 종료일 (YYYY-MM-DD)' })
  endDate: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: '직원 ID' })
  employeeId?: string;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: '출근 시간 (ISO 형식)' })
  checkInTime?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: '퇴근 시간 (ISO 형식)' })
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: '메모' })
  note?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  @ApiProperty({ 
    required: false, 
    enum: AttendanceStatus,
    description: '출결 상태 (PRESENT, LATE, ABSENT, HALF_DAY)' 
  })
  status?: AttendanceStatus;
} 