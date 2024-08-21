import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Deal } from './helpers/interfaces/deal.interface';
import { Cron } from '@nestjs/schedule';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hotdeal')
  async callbackHotDeal(
    @Query('number') number: number,
    @Query('id') id: number,
    @Query('positions') positions: any,
    @Query('cost_money') cost_money: string,
    @Query('user') user: string,
    @Query('phone') phone: string,
  ) {
    const newDeal: Deal = {
      number,
      id,
      positions,
      cost_money,
      user,
      phone,
    };

    return this.appService.sendNotificationAboutNewDeal(newDeal);
  }

  @Cron('0 3 * * *')
  async sendNotificationAboutDuty() {
    return this.appService.sendNotificationAboutDuty();
  }

  @Cron('0 15 * * *')
  async sendNotificationAboutTomorrowDuty() {
    return this.appService.sendNotificationAboutTomorrowDuty();
  }
}
