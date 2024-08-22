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

      // Сохраняем все дежурства в сессии
      ctx.session.duties = this.formatDuties(duties);

      // Отправляем первую страницу
      this.sendDutyPage(ctx, 0);
    });

    // Обрабатываем действия для пагинации
    this.client.action(/schedule_page_(\d+)/, async (ctx) => {
      const page = parseInt(ctx.match[1], 10);
      this.sendDutyPage(ctx, page);
    });
  }

  private formatDuties(duties: Duty[]): FormattedDuty[] {
    return duties.map((duty) => {
      const date = new Date(duty.date);
      const day = date.getDate();
      const month = date.toLocaleString('ru-RU', { month: 'long' });

      return {
        managerName: duty.managerName,
        formattedDate: `${day} ${month.toLowerCase()}`,
      };
    });
  }

  private sendDutyPage(ctx: MyContext, page: number) {
    const duties = ctx.session.duties;
    const pageSize = 9;
    const startIndex = page * pageSize;
    const pageDuties = duties.slice(startIndex, startIndex + pageSize);

    if (pageDuties.length === 0) {
      return ctx.reply('Дежурств нет');
    }

    let replyText: string;

    if (page === 0) {
      // Определяем дежурных на сегодня, завтра и следующие 7 дней
      const todayDuty = pageDuties[0];
      const tomorrowDuty = pageDuties[1];
      const nextSevenDaysDuties = pageDuties.slice(2, 9);

      const todayText = `Дежурный сегодня: <code>${todayDuty.managerName}</code>`;
      const tomorrowText = `Дежурный завтра: <code>${tomorrowDuty.managerName}</code>`;
      const nextSevenDaysText = nextSevenDaysDuties
        .map(
          (duty) =>
            `<code>${duty.managerName}</code> -> <b>${duty.formattedDate}</b>`,
        )
        .join('\n');

      replyText = `${todayDuty.formattedDate.split(' ')[1]}:\n\n${todayText}\n${tomorrowText}\n\nДежурные на следующие 7 дней:\n${nextSevenDaysText}`;
    } else {
      // Для последующих страниц показываем только список дежурств
      replyText = pageDuties
        .map(
          (duty) =>
            `<code>${duty.managerName}</code> -> <b>${duty.formattedDate}</b>`,
        )
        .join('\n');
    }

    // Создаем кнопки для пагинации
    const buttons = [];
    if (startIndex > 0) {
      buttons.push({ text: '<-', callback_data: `schedule_page_${page - 1}` });
    }
    if (startIndex + pageSize < duties.length) {
      buttons.push({ text: '->', callback_data: `schedule_page_${page + 1}` });
    }

    ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: [
          buttons,
          [{ text: 'Вернуться в меню', callback_data: 'menu' }],
        ],
      },
      parse_mode: 'HTML',
    });
  }
}
