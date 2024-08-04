/* eslint-disable @typescript-eslint/no-unused-vars */
import { InjectRepository } from '@nestjs/typeorm';
import { Duty } from 'src/duties/entities/duty.entity';
import { Scene } from 'src/helpers/classes/scene.class';
import { MyContext } from 'src/helpers/interfaces/context.interface';
import { HotManager } from 'src/managers/entities/manager.entity';
import { Composer, Scenes, Telegraf } from 'telegraf';
import { WizardScene } from 'telegraf/typings/scenes';
import { Repository } from 'typeorm';

export class EditScheduleScene extends Scene {
  public scene: WizardScene<MyContext>;
  month: number;
  currentDate: Date;
  dayButtons: any;
  constructor(
    public client: Telegraf<MyContext>,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
    @InjectRepository(Duty)
    private dutyRepository: Repository<Duty>,
  ) {
    super(client);
  }

  async handle(): Promise<void> {
    const step1 = new Composer<MyContext>(); // выбор менеджера
    const step2 = new Composer<MyContext>(); // выбор месяца
    const step3 = new Composer<MyContext>(); // выбор месяца

    const chunkArray = (array: any[], chunkSize: number) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      chunks.push([{ text: 'Готово', callback_data: 'finish' }]);
      return chunks;
    };

    step1.action(/^manager_/, async (ctx) => {
      ctx.session.selectedManager = ctx.match.input.split('_')[1];
      const monthes = {
        Январь: 1,
        Февраль: 2,
        Март: 3,
        Апрель: 4,
        Май: 5,
        Июнь: 6,
        Июль: 7,
        Август: 8,
        Сентябрь: 9,
        Октябрь: 10,
        Ноябрь: 11,
        Декабрь: 12,
      };

      const sortedMonthes = Object.entries(monthes)
        .filter(([_, index]) => index >= this.month)
        .sort((a, b) => a[1] - b[1])
        .concat(
          Object.entries(monthes).filter(([_, index]) => index < this.month),
        );

      const monthButtons = sortedMonthes.map(([monthName, index]) => ({
        text: monthName,
        callback_data: `month_${monthName}_${index}`,
      }));

      await ctx.editMessageText(
        `Выбранный менеджер: ${ctx.session.selectedManager}\n\n` +
          `Выберите месяц:`,
      );
      await ctx.editMessageReplyMarkup({
        inline_keyboard: monthButtons.map((button) => [button]),
      });

      return ctx.wizard.next();
    });

    step2.action(/^month_/, async (ctx) => {
      ctx.session.selectedMonth = ctx.match.input.split('_')[1];
      ctx.session.selectedMonthIndex = ctx.match.input.split('_')[2];

      const duties = await this.dutyRepository
        .createQueryBuilder('duty')
        .where('EXTRACT(MONTH FROM duty.date) = :month', {
          month: this.month,
        })
        .getMany();

      const busyDays = duties.map((duty) => new Date(duty.date).getDate());
      const currentYear = this.currentDate.getFullYear();
      const currentMonth = this.currentDate.getMonth() + 1;
      const currentDay = this.currentDate.getDate();

      const daysInMonth = new Date(
        currentYear,
        ctx.session.selectedMonthIndex,
        0,
      ).getDate();
      const availableDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        .filter((day) => !busyDays.includes(day))
        .filter(
          (day) =>
            ctx.session.selectedMonthIndex > currentMonth || day >= currentDay,
        );

      this.dayButtons = availableDays.map((day) => ({
        text: `${day} ${ctx.session.selectedMonth.slice(0, 3)}`,
        callback_data: `duty_${day}`,
      }));

      const chunkedDayButtons = chunkArray(this.dayButtons, 3);

      await ctx.editMessageText(
        `Выбранный менеджер: ${ctx.session.selectedManager}\nВыбранный месяц: ${ctx.session.selectedMonth}\n\n` +
          `Выберите дни(выбирайте несколько вариантов, как будет готово, нажмите кнопку "Готово"):`,
      );
      await ctx.editMessageReplyMarkup({
        inline_keyboard: chunkedDayButtons,
      });

      return ctx.wizard.next();
    });

    step3.action(/^duty_/, async (ctx) => {
      const selectedDay = ctx.match.input.split('_')[1];
      if (!ctx.session.selectedDays) {
        ctx.session.selectedDays = [];
      }

      ctx.session.selectedDays.push(selectedDay);

      // Remove selected days from dayButtons
      this.dayButtons = this.dayButtons.filter(
        (button) => !button.text.startsWith(selectedDay),
      );

      const chunkedDayButtons = chunkArray(this.dayButtons, 3);

      await ctx.editMessageText(
        `Выбранный менеджер: ${ctx.session.selectedManager}\nВыбранный месяц: ${ctx.session.selectedMonth}\nВыбранные дни: ${ctx.session.selectedDays.join(', ')}\n\n` +
          `Выберите дни(выбирайте несколько вариантов, как будет готово, нажмите кнопку "Готово"):`,
      );
      await ctx.editMessageReplyMarkup({ inline_keyboard: chunkedDayButtons });
    });

    step3.action('finish', async (ctx) => {
      const { selectedDays, selectedMonth, selectedManager } = ctx.session;
      const monthes = {
        Январь: 1,
        Февраль: 2,
        Март: 3,
        Апрель: 4,
        Май: 5,
        Июнь: 6,
        Июль: 7,
        Август: 8,
        Сентябрь: 9,
        Октябрь: 10,
        Ноябрь: 11,
        Декабрь: 12,
      };
      const selectedMonthIndex = monthes[selectedMonth];
      const currentYear = this.currentDate.getFullYear();

      const selectedDates = selectedDays.map((day) => {
        const dayInt = parseInt(day, 10);
        const date = new Date(currentYear, selectedMonthIndex - 1, dayInt);
        return date.toISOString().split('T')[0];
      });

      for (const date of selectedDates) {
        const duty = new Duty();
        duty.managerName = selectedManager;
        duty.date = date;
        await this.dutyRepository.save(duty);
      }

      await ctx.reply(
        `Дежурства для ${selectedManager} добавлены: ${selectedDates.join(', ')}`,
      );
      return ctx.scene.leave();
    });

    this.scene = new Scenes.WizardScene(
      'edit',
      async (ctx) => {
        this.currentDate = new Date();
        this.month = this.currentDate.getMonth() + 1;

        const managers = await this.managersRepository.find();
        const managerButtons = managers.map((manager) => ({
          text: manager.managerName,
          callback_data: `manager_${manager.managerName}`,
        }));
        await ctx.reply('Выберите менеджера:', {
          reply_markup: {
            inline_keyboard: managerButtons.map((button) => [button]),
          },
        });
        return ctx.wizard.next();
      },
      step1,
      step2,
      step3,
    );
  }
}
