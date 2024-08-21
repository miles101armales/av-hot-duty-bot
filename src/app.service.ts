import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes } from 'telegraf';
import { MyContext } from './helpers/interfaces/context.interface';
import { Command } from './helpers/classes/command.class';
import { Scene } from './helpers/classes/scene.class';
import { StartCommand } from './commands/start.command';
import { InjectRepository } from '@nestjs/typeorm';
import { HotManager } from './managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { ScheduleCommand } from './commands/schedule_duty.command';
import { Duty } from './duties/entities/duty.entity';
import { EditScheduleScene } from './scenes/edit_schedule.scene';
import { reply_start_admin } from './helpers/constants';
import * as LocalSession from 'telegraf-session-local';
import { Deal } from './helpers/interfaces/deal.interface';

@Injectable()
export class AppService {
  public readonly client: Telegraf<MyContext>;
  private commands: Command[] = [];
  private scenes: Scene[] = [];
  private scenesNames: Scenes.WizardScene<MyContext>[] = [];
  public updatedTime: string;
  public managerName: string;
  public dutyChatId: number;

  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
    @InjectRepository(Duty)
    private dutyRepository: Repository<Duty>,
  ) {
    this.client = new Telegraf<MyContext>(
      this.configService.get('TELEGRAM_API_KEY'),
    );
    this.client.use(
      new LocalSession({ database: 'sessions.json' }).middleware(),
    );
  }

  async onApplicationBootstrap() {
    try {
      this.commands = [
        new StartCommand(this.client, this.managersRepository),
        new ScheduleCommand(
          this.client,
          this.managersRepository,
          this.dutyRepository,
        ),
      ];
      for (const command of this.commands) {
        command.handle();
      }

      this.scenes = [
        new EditScheduleScene(
          this.client,
          this.managersRepository,
          this.dutyRepository,
        ),
      ];
      for (const scene of this.scenes) {
        scene.handle();
        this.scenesNames.push(scene.scene);
      }
      const stage = new Scenes.Stage(this.scenesNames);
      // this.client.use(session());
      this.client.use(stage.middleware());

      this.client.launch();
      this.logger.log('Telegram Bot initialized');

      this.client.command('edit', async (ctx) => {
        return ctx.reply('Выберите комманду', reply_start_admin);
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.client.command('test', (ctx) => {
        this.sendTestNotificationAboutDuty();
        this.sendTestNotificationAboutTomorrowDuty();
      });

      this.client.action('edit_duty', async (ctx) => {
        this.logger.log(
          'Edit Schedule Command initialized by ' + ctx.from.username,
        );
        ctx.scene.enter('edit');
      });

      this.client.catch((err, ctx) => {
        ctx.reply(
          'Похоже возникла ошибка, я уже работаю над ней. Перезапусти бота командой /start',
        );
        ctx.telegram.sendMessage(
          416018817,
          `@${ctx.from.username} получил ошибку\n\n${err}`,
        );
      });
    } catch (error) {
      this.logger.error('Error initializing bot', error);
    }
  }

  async sendNotificationAboutDuty() {
    const currentDay = new Date().toISOString().split('T')[0].split('-')[2]; //получаем текущую дату в корректном формате
    const currentMonth = new Date().getMonth();
    const chat_ids = [];
    let manager: HotManager;

    const duties = await this.dutyRepository
      .createQueryBuilder('duty')
      .where(
        'EXTRACT(DAY FROM duty.date) = :day AND EXTRACT(MONTH FROM duty.date) = :month',
        {
          day: currentDay,
          month: currentMonth + 1,
        },
      )
      .getMany();

    for (const duty of duties) {
      manager = await this.managersRepository.findOne({
        where: { managerName: duty.managerName },
      });
      chat_ids.push(manager.chat_id);
      this.dutyChatId = manager.chat_id;
    }

    for (const chatId of chat_ids) {
      this.client.telegram.sendMessage(416018817, 'Уведомление отправлено');
      return this.client.telegram.sendMessage(
        chatId,
        `Привет ${manager.managerName}. Сегодня день твоего дежурства! Будь на готове.`,
      );
    }
  }

  async sendTestNotificationAboutDuty() {
    const currentDay = new Date().toISOString().split('T')[0].split('-')[2]; //получаем текущую дату в корректном формате
    const currentMonth = new Date().getMonth();
    const chat_ids = [];
    let manager: HotManager;

    const duties = await this.dutyRepository
      .createQueryBuilder('duty')
      .where(
        'EXTRACT(DAY FROM duty.date) = :day AND EXTRACT(MONTH FROM duty.date) = :month',
        {
          day: currentDay,
          month: currentMonth + 1,
        },
      )
      .getMany();

    for (const duty of duties) {
      manager = await this.managersRepository.findOne({
        where: { managerName: duty.managerName },
      });
      chat_ids.push(manager.chat_id);
      this.dutyChatId = manager.chat_id;
    }
  }

  async sendNotificationAboutTomorrowDuty() {
    const currentDay = new Date().getDate(); //получаем текущую дату в корректном формате
    const currentMonth = new Date().getMonth();
    const chat_ids = [];
    let manager: HotManager;

    const nextDay = currentDay + 1;
    console.log(nextDay, currentMonth);
    const duties = await this.dutyRepository
      .createQueryBuilder('duty')
      .where(
        'EXTRACT(DAY FROM duty.date) = :day AND EXTRACT(MONTH FROM duty.date) = :month',
        {
          day: nextDay,
          month: currentMonth + 1,
        },
      )
      .getMany();

    console.log(duties);
    for (const duty of duties) {
      console.log(duty);
      manager = await this.managersRepository.findOne({
        where: { managerName: duty.managerName },
      });
      chat_ids.push(manager.chat_id);
    }

    for (const chatId of chat_ids) {
      this.client.telegram.sendMessage(
        416018817,
        'Уведомление отправлено на завтра',
      );
      return this.client.telegram.sendMessage(
        chatId,
        `Привет ${manager.managerName}. Завтра день твоего дежурства! Будь на готове.`,
      );
    }
  }

  async sendTestNotificationAboutTomorrowDuty() {
    const currentDay = new Date().getDate(); //получаем текущую дату в корректном формате
    const currentMonth = new Date().getMonth();
    const chat_ids = [];
    let manager: HotManager;

    const nextDay = currentDay + 1;
    console.log(nextDay, currentMonth);
    const duties = await this.dutyRepository
      .createQueryBuilder('duty')
      .where(
        'EXTRACT(DAY FROM duty.date) = :day AND EXTRACT(MONTH FROM duty.date) = :month',
        {
          day: nextDay,
          month: currentMonth + 1,
        },
      )
      .getMany();

    console.log(duties);
    for (const duty of duties) {
      console.log(duty);
      manager = await this.managersRepository.findOne({
        where: { managerName: duty.managerName },
      });
      chat_ids.push(manager.chat_id);
    }
  }

  async sendNotificationAboutNewDeal(deal: Deal) {
    const replytext =
      `Открыт новый заказ! Информация:\n\n` +
      `Номер заказа: <b>${deal.number}</b>\n` +
      `Состав заказа: <b>${deal.positions}</b>\n` +
      `Стоимость заказа: <b>${deal.cost_money}</b>\n` +
      `Пользователь: <b>${deal.user}</b>\n` +
      `Номер телефона: <b>${deal.phone}</b>\n\n` +
      `Ссылка на заказ: https://azatvaleev.getcourse.ru/sales/control/deal/update/id/${deal.id}\n\n`;

    return this.client.telegram.sendMessage(this.dutyChatId, replytext, {
      parse_mode: 'HTML',
    });
  }
}
