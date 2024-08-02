import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Command } from 'src/helpers/classes/command.class';
import { MyContext } from 'src/helpers/interfaces/context.interface';
import { DutySchedule, HotManager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';

export class ScheduleCommand extends Command {
  private readonly logger = new Logger(ScheduleCommand.name);
  constructor(
    public readonly client: Telegraf<MyContext>,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
  ) {
    super(client);
  }

  handle() {
    this.client.action('schedule_duty', async (ctx) => {
      this.logger.log('Schedule Command initialized by ' + ctx.from.username);
      const managers = await this.managersRepository.find();
      const message = this.formatManagersDuty(managers);
      await ctx.reply(message);
    });
  }

  public formatManagersDuty(managers: HotManager[]): string {
    return managers
      .map((manager) => {
        let dutyDays = this.formatDutyDays(manager.duty);
        if (dutyDays == '') {
          dutyDays = 'нет дежурств';
        }
        return `${manager.managerName} -> ${dutyDays}`;
      })
      .join('\n');
  }

  public formatDutyDays(duty: DutySchedule): string {
    return Object.entries(duty)
      .filter(([, isOnDuty]) => isOnDuty)
      .map(([day]) => new Date(day).toLocaleDateString())
      .join(', ');
  }
}
