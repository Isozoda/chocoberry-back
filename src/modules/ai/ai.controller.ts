import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AnalyzeSalesDto } from './dto/analyze-sales.dto';
import { ForecastInventoryDto } from './dto/forecast-inventory.dto';
import { AskAdvisorDto } from './dto/ask-advisor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze/sales')
  analyzeSales(@CurrentUser() user: { id: string }, @Body() dto: AnalyzeSalesDto) {
    return this.aiService.analyzeSales(user.id, dto);
  }

  @Post('forecast/inventory')
  forecastInventory(@CurrentUser() user: { id: string }, @Body() dto: ForecastInventoryDto) {
    return this.aiService.forecastInventory(user.id, dto);
  }

  @Post('advisor/weekly')
  weeklyAdvice(@CurrentUser() user: { id: string }) {
    return this.aiService.getAdvice(user.id, {});
  }

  @Post('advisor/ask')
  askAdvisor(@CurrentUser() user: { id: string }, @Body() dto: AskAdvisorDto) {
    return this.aiService.getAdvice(user.id, dto);
  }

  @Get('history')
  getHistory(@CurrentUser() user: { id: string }) {
    return this.aiService.getChatHistory(user.id);
  }
}
