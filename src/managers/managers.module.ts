import { Module } from '@nestjs/common';
import { ManagersService } from './managers.service';
import { ManagersController } from './managers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotManager } from './entities/manager.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HotManager])],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [TypeOrmModule],
})
export class ManagersModule {}
