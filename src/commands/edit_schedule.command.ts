import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Command } from 'src/helpers/classes/command.class';
import { MyContext } from 'src/helpers/interfaces/context.interface';
import { DutySchedule, HotManager } from 'src/managers/entities/manager.entity';
import { Markup, Telegraf } from 'telegraf';
import { Repository } from 'typeorm';

export class EditScheduleCommand extends Command {
  managerId: number;
  private readonly logger = new Logger(EditScheduleCommand.name);

  constructor(
    public readonly client: Telegraf<MyContext>,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
  ) {
    super(client);
  }

  handle() {
    this.client.action('edit_duty', async (ctx) => {
      this.logger.log(
        'Edit Schedule Command initialized by ' + ctx.from.username,
      );
      const managers = await this.managersRepository.find();

      const buttons = managers.map((manager) =>
        Markup.button.callback(
          manager.managerName,
          `manager_select_${manager.id}`,
        ),
      );
      const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

      await ctx.reply(
        'Выберите менеджера для редактирования дежурства:',
        keyboard,
      );

      managers.forEach((manager) => {
        this.client.action(`manager_select_${manager.id}`, async (ctx) => {
          const selectedManager = await this.managersRepository.findOne({
            where: { id: manager.id },
          });

          if (selectedManager) {
            this.managerId = manager.id;
            const dutyMessage = this.formatDutyMessage(selectedManager.duty);
            await ctx.reply(
              `Дежурства для ${selectedManager.managerName}:\n${dutyMessage}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Добавить дежурство', callback_data: 'add_duty' }],
                  ],
                },
              },
            );
          } else {
            await ctx.reply('Менеджер не найден.');
          }
        });
      });

      this.client.action('add_duty', async (ctx) => {
        const selectedManager = await this.managersRepository.findOne({
          where: { id: this.managerId },
        });

        if (!selectedManager) {
          await ctx.reply('Менеджер не найден.');
          return;
        }

        await ctx.reply('Введите дату в формате YYYY-MM-DD:');
        this.client.hears(
          /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
          async (ctx) => {
            const date = ctx.message.text;

            await ctx.reply('Введите значение (true или false):');
            this.client.hears(/^(true|false)$/, async (ctx) => {
              const value = ctx.message.text.toLowerCase() === 'true';

              selectedManager.duty[date] = value;
              await this.managersRepository.save(selectedManager);

              await ctx.reply(
                `Дежурство для ${selectedManager.managerName} на ${date} обновлено.`,
              );
            });
          },
        );
      });
    });
  }

  private formatDutyMessage(duty: DutySchedule): string {
    return Object.entries(duty)
      .map(
        ([day, isOnDuty]) =>
          `${new Date(day).toLocaleDateString()}: ${
            isOnDuty ? 'дежурный' : 'не дежурный'
          }`,
      )
      .join('\n');
  }
}
