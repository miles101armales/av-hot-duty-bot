import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes, session } from 'telegraf';
import { MyContext } from './helpers/interfaces/context.interface';
import { Command } from './helpers/classes/command.class';
import { Scene } from './helpers/classes/scene.class';
import { StartCommand } from './commands/start.command';
import { InjectRepository } from '@nestjs/typeorm';
import { HotManager } from './managers/entities/manager.entity';
import { Repository } from 'typeorm';
import { EditScheduleCommand } from './commands/edit_schedule.command';
import { ScheduleCommand } from './commands/schedule_duty.command';

@Injectable()
export class AppService {
  public readonly client: Telegraf<MyContext>;
  private commands: Command[] = [];
  private scenes: Scene[] = [];
  private scenesNames: Scenes.WizardScene<MyContext>[] = [];
  public updatedTime: string;
  public managerName: string;

  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
  ) {
    this.client = new Telegraf<MyContext>(
      this.configService.get('TELEGRAM_API_KEY'),
    );
  }
  async onApplicationBootstrap() {
    try {
      this.commands = [
        new StartCommand(this.client, this.managersRepository),
        new EditScheduleCommand(this.client, this.managersRepository),
        new ScheduleCommand(this.client, this.managersRepository),
      ];
      for (const command of this.commands) {
        command.handle();
      }

      this.scenes = [];
      for (const scene of this.scenes) {
        scene.handle();
        this.scenesNames.push(scene.scene);
      }
      const stage = new Scenes.Stage(this.scenesNames);
      this.client.use(session());
      this.client.use(stage.middleware());
      this.client.hears('Написать обращение', (ctx) =>
        ctx.scene.enter('appeal'),
      );

      this.client.launch();
      this.logger.log('Telegram Bot initialized');
      // for (const _client of clients) {
      //   if (_client.manager && _client.authorization === false) {
      //     this.client.telegram.sendMessage(
      //       _client.chat_id,
      //       'Вы зарегестрированы. Нажмите кнопку ниже или введите комманду /auth',
      //     );
      //   }
      //   this.client.telegram.sendMessage(
      //     _client.chat_id,
      //     '<b>Уважаемая команда Отдела Продаж!</b>\n\n' +
      //       'Поздравляю вас с началом нового месяца! 🌟 Пусть август принесет вам новые возможности, успешные сделки и исполнение всех поставленных целей. 💼 Благодарю каждого из вас за труд и преданность делу. Ваш вклад в нашу компанию неоценим, и я уверен, что вместе мы достигнем еще больших высот. 🚀\n\n' +
      //       'Желаю вам плодотворной работы, вдохновения и положительных эмоций! ✨ Пусть каждый день будет насыщен успехами и профессиональными достижениями. 🏆\n\n' +
      //       '<b>Анализ продаж за июль</b>\n\n' +
      //       'Продукты с наибольшей прибылью:\n' +
      //       '•	Годовая программа “Деньги под ключ” (старт от 19 июля) — 2,830,585 ₽\n' +
      //       '•	Миллион на дропах с поддержкой (в рассрочку) — 4,488,197 ₽\n' +
      //       '•	Для частичной оплаты ДПК — 1,036,230 ₽\n\n' +
      //       'Дни с наибольшей прибылью:\n' +
      //       '•	31 июля — 2,468,527 ₽\n' +
      //       '•	30 июля — 1,471,448 ₽\n' +
      //       '•	22 июля — 1,301,880 ₽\n\n' +
      //       'Если вам понравился анализ, поставь свою оценку нажав на кнопку ниже! Также я открыт к новым идеям и всегда буду рад вашим обращениям по кнопке "Написать обращение". В этом месяце продолжится улучшение работы обновлений в реальном времени, добавление страницы "Моя команда" и интерфейс для руководителей!',
      //     {
      //       parse_mode: 'HTML',
      //       reply_markup: {
      //         inline_keyboard: [
      //           [{ text: '👍', callback_data: 'like_analize' }],
      //         ],
      //       },
      //     },
      //   );
      // }
    } catch (error) {}
  }
}
