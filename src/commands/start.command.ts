import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Command } from 'src/helpers/classes/command.class';
import { reply_start_admin, reply_start_manager } from 'src/helpers/constants';
import { MyContext } from 'src/helpers/interfaces/context.interface';
import { CreateManagerDto } from 'src/managers/dto/create-manager.dto';
import { HotManager } from 'src/managers/entities/manager.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';

export class StartCommand extends Command {
  private readonly logger = new Logger(StartCommand.name);
  constructor(
    public readonly client: Telegraf<MyContext>,
    @InjectRepository(HotManager)
    private managersRepository: Repository<HotManager>,
  ) {
    super(client);
  }
  handle() {
    this.client.start(async (ctx) => {
      const newClient: CreateManagerDto = {
        username: ctx.from.username,
        name: ctx.from.first_name,
        chat_id: ctx.chat.id,
        managerName: '',
        duty: {},
        role: 'manager',
      };

      ctx.session.chat_id = ctx.chat.id;

      const existedClient = await this.managersRepository.findOne({
        where: { chat_id: ctx.chat.id },
      });

      if (!existedClient) {
        this.logger.log('Create new user: ' + ctx.from.username);
        await this.managersRepository.save(newClient);
        ctx.reply('Выберите комманду', reply_start_manager);
      } else {
        this.logger.log('Start command initialized by ' + ctx.from.username);
        if (existedClient.role == 'admin') {
          ctx.reply('Выберите комманду', reply_start_admin);
        } else {
          ctx.reply('Выберите комманду', reply_start_manager);
        }
      }
    });
  }
}
