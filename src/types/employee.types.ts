import { Role } from '../common/enums/role.enum';

export interface CreateEmployeeDto {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface UpdateEmployeeDto {
  name?: string;
  isActive?: boolean;
  role?: Role;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface LoginDto {
  email: string;
  password: string;
} 