import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { SystemAdminService } from './system-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, SystemAdminService],
  exports: [UsersService, SystemAdminService],
})
export class UsersModule {} 