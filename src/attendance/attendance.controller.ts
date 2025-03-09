import { Controller, Get, Post, Body, Patch, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AttendanceQueryDto, AttendanceStatsQueryDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '출근 체크인' })
  async checkIn(@Request() req) {
    return this.attendanceService.checkIn(req.user.id);
  }

  @Post('check-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '퇴근 체크아웃' })
  async checkOut(@Request() req) {
    return this.attendanceService.checkOut(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 출퇴근 기록 조회' })
  async getMyAttendance(
    @Request() req,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getEmployeeAttendance(req.user.id, query);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 직원의 출퇴근 기록 조회 (관리자, 매니저 권한)' })
  async getEmployeeAttendance(
    @Param('id') employeeId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getEmployeeAttendance(employeeId, query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '출퇴근 통계 조회 (관리자, 매니저 권한)' })
  async getAttendanceStats(@Query() query: AttendanceStatsQueryDto) {
    return this.attendanceService.getAttendanceStats(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '출퇴근 기록 수정 (관리자 권한)' })
  async updateAttendance(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendance(id, updateAttendanceDto);
  }
} 