import { DutySchedule } from '../entities/manager.entity';

export class CreateManagerDto {
  username: string;

  name: string;

  chat_id: number;

  managerName: string;

  duty: DutySchedule;

  role: 'admin' | 'manager';
}
