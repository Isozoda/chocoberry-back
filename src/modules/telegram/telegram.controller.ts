import { Controller, Post, Get, Delete, Body, Req, Headers, UnauthorizedException, HttpCode, Query } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotifyLowStockDto, NotifyDailyReportDto } from './dto/notify.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  getStatus(@Req() req: { user: { id: string } }) {
    return this.telegramService.getStatus(req.user.id);
  }

  @Get('inventory/status')
  @Public()
  getInventoryStatus(@Query('chatId') chatId: string, @Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.getInventoryStatusByChatId(chatId);
  }

  @Get('connect-link')
  getConnectLink(@Req() req: { user: { id: string } }) {
    return this.telegramService.getConnectLink(req.user.id);
  }

  @Delete('unsubscribe')
  @HttpCode(200)
  unsubscribe(@Req() req: { user: { id: string } }) {
    return this.telegramService.unsubscribe(req.user.id);
  }

  @Post('subscribe')
  @Public()
  @HttpCode(200)
  subscribe(@Body() dto: SubscribeDto, @Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.subscribe(dto);
  }

  @Post('notify/low-stock')
  @Public()
  @HttpCode(200)
  notifyLowStock(@Body() dto: NotifyLowStockDto, @Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.notifyLowStock(dto);
  }

  @Post('notify/daily-report')
  @Public()
  @HttpCode(200)
  notifyDailyReport(@Body() dto: NotifyDailyReportDto, @Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.notifyDailyReport(dto);
  }

  @Get('inventory/items')
  @Public()
  getInventoryItems(@Query('chatId') chatId: string, @Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.getInventoryItemsByChatId(chatId);
  }

  @Post('bulk-deduct')
  @Public()
  @HttpCode(200)
  bulkDeduct(
    @Body() body: { chatId: string; items: Array<{ itemId: string; quantity: number; unit: string }>; rawMessage?: string },
    @Headers('x-bot-secret') secret: string,
  ) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.bulkDeduct(body.chatId, body.items, body.rawMessage);
  }

  @Get('daily-report/latest')
  getLatestDailyReport(@Req() req: { user: { id: string } }) {
    return this.telegramService.getLatestTelegramDailyReport(req.user.id);
  }

  @Post('daily-report/parse')
  @Public()
  @HttpCode(200)
  parseDailyReport(
    @Body() body: { rawText: string },
    @Headers('x-bot-secret') secret: string,
  ) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.parseDailyReport(body.rawText);
  }

  @Post('daily-report/save')
  @Public()
  @HttpCode(200)
  async saveDailyReport(
    @Body() body: {
      chatId: string;
      date: string;
      openingBalance: number;
      closingBalance: number;
      totalExpenses: number;
      rawText: string;
      items: Array<{ name: string; amount: number; category: string }>;
    },
    @Headers('x-bot-secret') secret: string,
  ) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    const id = await this.telegramService.saveTelegramDailyReport(body.chatId, body);
    return { ok: true, id };
  }

  @Post('notify/due-soon')
  @Public()
  @HttpCode(200)
  notifyDueSoon(@Headers('x-bot-secret') secret: string) {
    const expected = this.config.get<string>('telegram.botSecret') || 'chocoberry_bot_secret';
    if (!secret || secret !== expected) throw new UnauthorizedException('Invalid bot secret');
    return this.telegramService.notifyDueSoonFixedExpenses();
  }
}
