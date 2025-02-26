import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { SystemAdminService } from './system-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService, SystemAdminService],
  exports: [UsersService, SystemAdminService],
})
export class UsersModule { } 