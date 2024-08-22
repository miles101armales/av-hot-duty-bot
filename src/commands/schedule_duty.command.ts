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

    this.client.action('my_duties', async (ctx: MyContext) => {
      const manager = await this.managersRepository.findOne({
        where: { chat_id: ctx.chat.id },
      });
      this.logger.log('My Duties Command initialized by ' + ctx.from.username);

      const duties = await this.dutyRepository.find({
        order: { date: 'ASC' },
        where: { managerName: manager.managerName },
      });

      if (!duties || duties.length === 0) {
        return ctx.reply('У вас нет дежурств');
      }

      // Отправляем сообщение с дежурствами этого менеджера
      this.sendManagerDuties(ctx, this.formatDuties(duties));
    });

    // Обрабатываем действия для пагинации
    this.client.action(/schedule_page_(\d+)/, async (ctx) => {
      const page = parseInt(ctx.match[1], 10);
      this.editDutyPage(ctx, page);
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

  private async sendDutyPage(ctx: MyContext, page: number) {
    const duties = ctx.session.duties;
    const pageSize = 9;
    const startIndex = page * pageSize;
    const pageDuties = duties.slice(startIndex, startIndex + pageSize);

    if (pageDuties.length === 0) {
      return ctx.reply('Дежурств нет');
    }

    const replyText = this.generateDutyText(page, pageDuties);

    // Создаем кнопки для пагинации
    const buttons = this.generatePaginationButtons(
      page,
      duties.length,
      pageSize,
    );

    await ctx.reply(replyText, {
      reply_markup: {
        inline_keyboard: [
          buttons,
          [{ text: 'Вернуться в меню', callback_data: 'menu' }],
        ],
      },
      parse_mode: 'HTML',
    });
  }

  private async editDutyPage(ctx: MyContext, page: number) {
    const duties = ctx.session.duties;
    const pageSize = 9;
    const startIndex = page * pageSize;
    const pageDuties = duties.slice(startIndex, startIndex + pageSize);

    if (pageDuties.length === 0) {
      return ctx.editMessageText('Дежурств нет');
    }

    const replyText = this.generateDutyText(page, pageDuties);

    // Создаем кнопки для пагинации
    const buttons = this.generatePaginationButtons(
      page,
      duties.length,
      pageSize,
    );

    await ctx.editMessageText(replyText, {
      reply_markup: {
        inline_keyboard: [
          buttons,
          [{ text: 'Вернуться в меню', callback_data: 'menu' }],
        ],
      },
      parse_mode: 'HTML',
    });
  }

  private generateDutyText(page: number, duties: FormattedDuty[]): string {
    if (page === 0) {
      // Определяем дежурных на сегодня, завтра и следующие 7 дней
      const todayDuty = duties[0];
      const tomorrowDuty = duties[1];
      const nextSevenDaysDuties = duties.slice(2, 9);

      const todayText = `Дежурный сегодня: <code>${todayDuty.managerName}</code>`;
      const tomorrowText = `Дежурный завтра: <code>${tomorrowDuty.managerName}</code>`;
      const nextSevenDaysText = nextSevenDaysDuties
        .map(
          (duty) =>
            `<code>${duty.managerName}</code> -> <b>${duty.formattedDate}</b>`,
        )
        .join('\n');

      return `${todayDuty.formattedDate.split(' ')[1]}:\n\n${todayText}\n${tomorrowText}\n\nДежурные на следующие 7 дней:\n${nextSevenDaysText}`;
    } else {
      // Для последующих страниц показываем только список дежурств
      return duties
        .map(
          (duty) =>
            `<code>${duty.managerName}</code> -> <b>${duty.formattedDate}</b>`,
        )
        .join('\n');
    }
  }

  private generatePaginationButtons(
    page: number,
    totalDuties: number,
    pageSize: number,
  ) {
    const buttons = [];
    if (page > 0) {
      buttons.push({ text: '<-', callback_data: `schedule_page_${page - 1}` });
    }
    if (page * pageSize + pageSize < totalDuties) {
      buttons.push({ text: '->', callback_data: `schedule_page_${page + 1}` });
    }
    return buttons;
  }

  private async sendManagerDuties(ctx: MyContext, duties: FormattedDuty[]) {
    const nearestDuty = duties[0];
    const nextDuties = duties.slice(1);

    const nearestDutyText = `Ближайшее дежурство - ${nearestDuty.formattedDate}`;
    const nextDutiesText = nextDuties.length
      ? `Следующие дежурства:\n${nextDuties
          .map((duty) => `<code>${duty.formattedDate}</code>`)
          .join('\n')}`
      : 'Нет других дежурств.';

    const replyText = `${nearestDutyText}\n\n${nextDutiesText}`;

    await ctx.reply(replyText, { parse_mode: 'HTML' });
  }
}
