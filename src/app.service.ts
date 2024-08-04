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
import { ScheduleCommand } from './commands/schedule_duty.command';
import { Duty } from './duties/entities/duty.entity';
import { EditScheduleScene } from './scenes/edit_schedule.scene';
import { reply_start_admin } from './helpers/constants';
import * as LocalSession from 'telegraf-session-local';

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

      this.client.action('edit_duty', async (ctx) => {
        this.logger.log(
          'Edit Schedule Command initialized by ' + ctx.from.username,
        );
        ctx.scene.enter('edit');
      });
    } catch (error) {
      this.logger.error('Error initializing bot', error);
    }
  }
}
