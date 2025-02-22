import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  companyName: string;
}