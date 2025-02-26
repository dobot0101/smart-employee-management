import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, ChangePasswordDto, LoginDto } from '../types/employee.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Post('login')
  @ApiOperation({ summary: '직원 로그인' })
  async login(@Body() loginDto: LoginDto) {
    return this.employeesService.login(loginDto.email, loginDto.password);
  }

  @Post('register-employee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '새로운 직원 등록 (관리자, 매니저 권한)' })
  async registerEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req
  ) {
    return this.employeesService.registerEmployee(createEmployeeDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 목록 조회 (관리자 전용)' })
  async getAllEmployees(@Request() req) {
    return this.employeesService.getAllEmployees(req.user.id);
  }

  @Get('managed-employees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리 대상 직원 목록 조회 (관리자, 매니저 권한)' })
  async getManagedEmployees(@Request() req) {
    return this.employeesService.getManagedEmployees(req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 정보 수정 (관리자 전용)' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req
  ) {
    return this.employeesService.updateEmployee(id, updateEmployeeDto, req.user.id);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.employeesService.changePassword(req.user.id, changePasswordDto);
  }
} 