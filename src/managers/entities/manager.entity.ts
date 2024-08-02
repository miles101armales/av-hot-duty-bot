import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface DutySchedule {
  [day: string]: boolean;
}

@Entity()
export class HotManager {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  chat_id: number;

  @Column({ nullable: true })
  managerName: string;

  @Column({ type: 'jsonb', nullable: true })
  duty: DutySchedule;

  @Column({ nullable: true })
  role: 'admin' | 'manager';
}
