import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Duty } from 'src/duties/entities/duty.entity';
import { Command } from 'src/helpers/classes/command.class';
import { MyContext } from 'src/helpers/interfaces/context.interface';
import { HotManager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';

interface FormattedDuty {
  managerName: string;
  formattedDate: string;
}

export class ScheduleCommand extends Command {
  private readonly logger = new Logger(ScheduleCommand.name);

  constructor(
    public readonly client: Telegraf<MyContext>,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
    @InjectRepository(Duty)
    private dutyRepository: Repository<Duty>,
  ) {
    super(client);
  }

  handle() {
    this.client.action('schedule_duty', async (ctx: MyContext) => {
      this.logger.log('Schedule Command initialized by ' + ctx.from.username);

      const duties = await this.dutyRepository.find({ order: { date: 'ASC' } });
      if (!duties || duties.length === 0) {
        return ctx.reply('Дежурств нет');
      }

      // Group duties by month
      const groupedDuties = this.groupDutiesByMonth(duties);

      ctx.session.groupedDuties = groupedDuties;

      // Send the first page
      this.sendDutyPage(ctx, 0);
    });

    // Handle pagination actions
    this.client.action(/schedule_page_(\d+)/, async (ctx) => {
      const page = parseInt(ctx.match[1], 10);
      this.sendDutyPage(ctx, page);
    });
  }

  private groupDutiesByMonth(duties: Duty[]): {
    [key: string]: FormattedDuty[];
  } {
    const monthNames = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];

    const grouped: { [key: string]: FormattedDuty[] } = {};

    duties.forEach((duty) => {
      const date = new Date(duty.date);
      const month = monthNames[date.getMonth()];
      const day = date.getDate();

      if (!grouped[month]) {
        grouped[month] = [];
      }

      grouped[month].push({
        managerName: duty.managerName,
        formattedDate: `${day} ${month.toLowerCase()}`,
      });
    });

    return grouped;
  }

  private sendDutyPage(ctx: MyContext, page: number) {
    const groupedDuties = ctx.session.groupedDuties;
    const monthNames = Object.keys(groupedDuties);
    const duties = groupedDuties[monthNames[page]];

    if (!duties || duties.length === 0) {
      return ctx.reply('Дежурств нет');
    }

    const displayDuties = duties;
    const dutyText = displayDuties
      .map((duty) => `${duty.managerName} -> ${duty.formattedDate}`)
      .join('\n');

    const replyText = `${monthNames[page]}:\n${dutyText}`;

    // Create pagination buttons
    const buttons = [];
    if (page > 0) {
      buttons.push({ text: '<-', callback_data: `schedule_page_${page - 1}` });
    }
    if (page < monthNames.length - 1) {
      buttons.push({ text: '->', callback_data: `schedule_page_${page + 1}` });
    }

    ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '<-', callback_data: `schedule_page_${page - 1}` },
            { text: '->', callback_data: `schedule_page_${page + 1}` },
          ],
          [{ text: 'Вернуться в меню', callback_data: 'menu' }],
        ],
      },
    });
  }
}
