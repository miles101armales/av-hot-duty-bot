import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Duty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  managerName: string;

  @Column({ type: 'date' })
  date: Date;
}
