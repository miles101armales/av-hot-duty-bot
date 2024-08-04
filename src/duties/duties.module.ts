import { Module } from '@nestjs/common';
import { DutiesService } from './duties.service';
import { DutiesController } from './duties.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Duty } from './entities/duty.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Duty])],
  controllers: [DutiesController],
  providers: [DutiesService],
  exports: [TypeOrmModule],
})
export class DutiesModule {}
