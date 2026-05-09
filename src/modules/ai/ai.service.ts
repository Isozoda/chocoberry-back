import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { toDecimal } from '../../common/utils/decimal.util';
import Decimal from 'decimal.js';
import { buildSalesPrompt } from './prompts/sales.prompt';
import { buildInventoryPrompt } from './prompts/inventory.prompt';
import { buildAdvisorPrompt } from './prompts/advisor.prompt';
import { AnalyzeSalesDto } from './dto/analyze-sales.dto';
import { ForecastInventoryDto } from './dto/forecast-inventory.dto';
import { AskAdvisorDto } from './dto/ask-advisor.dto';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtl = 60 * 60 * 1000; // 1 hour
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('anthropic.apiKey');
    this.model = this.config.get<string>('anthropic.model') || 'claude-sonnet-4-20250514';
    this.client = new Anthropic({ apiKey });
  }

  private getCached(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtl });
  }

  clearCache(businessId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(businessId)) this.cache.delete(key);
    }
  }

  private async callAi(prompt: string, retryCount = 0): Promise<unknown> {
    try {
      const apiKey = (process.env.ANTHROPIC_API_KEY || this.config.get<string>('anthropic.apiKey'))?.trim();
      
      // If it's a Google API Key (starts with AIzaSy)
      if (apiKey?.startsWith('AIzaSy')) {
        return await this.callGemini(prompt, apiKey);
      }

      return await this.callClaude(prompt, apiKey);
    } catch (e) {
      if ((e.message.includes('429') || e.message.includes('503')) && retryCount < 2) {
        this.logger.warn(`AI Rate limit/Service error. Retrying in 5s... (Attempt ${retryCount + 1})`);
        await new Promise(res => setTimeout(res, 5000));
        return this.callAi(prompt, retryCount + 1);
      }
      throw e;
    }
  }

  private async callClaude(prompt: string, apiKey: string): Promise<unknown> {
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: this.model.includes('gemini') ? 'claude-3-5-sonnet-20240620' : this.model,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error(`Claude API error: ${err.message}`);
      throw new ServiceUnavailableException('AI сервис дастрас нест (Claude). Лутфан маблағи ҳисобро тафтиш кунед.');
    }
  }

  private async callGemini(prompt: string, apiKey: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const model = 'gemini-2.5-flash'; 
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const data = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      });

      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(body);
              const text = json.candidates[0].content.parts[0].text;
              const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
              resolve(JSON.parse(cleaned));
            } catch (e) {
              reject(new Error(`Failed to parse Gemini response: ${e.message}`));
            }
          } else {
            this.logger.error(`Gemini API error (Status ${res.statusCode}): ${body}`);
            reject(new Error(`Gemini API error (Status ${res.statusCode})`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    }).catch(err => {
      this.logger.error(`Gemini API error: ${err.message}`);
      throw new ServiceUnavailableException(`AI сервис дастрас нест (Gemini). Хатогӣ: ${err.message}`);
    });
  }

  private getPeriodDates(period: 'day' | 'week' | 'month', date?: string): { start: Date; end: Date; label: string } {
    const now = date ? new Date(date) : new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Рӯзи ҷорӣ' };
    }
    if (period === 'week') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Ҳафтаи ҷорӣ' };
    }
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Моҳи ҷорӣ' };
  }

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new Error('Business not found');
    return b;
  }

  async analyzeSales(userId: string, dto: AnalyzeSalesDto): Promise<unknown> {
    const b = await this.getBusiness(userId);
    const cacheKey = `${b.id}:sales:${dto.period}:${dto.date || 'now'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const { start, end, label } = this.getPeriodDates(dto.period, dto.date);

    const [salesAgg, expensesAgg, topProducts, dailySales, expenseBreakdown] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { businessId: b.id, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.sale.groupBy({
        by: ['date'],
        where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
        _sum: { total: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.groupBy({
        by: ['expenseType'],
        where: { businessId: b.id, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const totalSales = toDecimal(salesAgg._sum.total || 0);
    const totalExpenses = toDecimal(expensesAgg._sum.amount || 0);

    const rawData = {
      period: label,
      totalSales: totalSales.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: totalSales.minus(totalExpenses).toFixed(2),
      salesCount: salesAgg._count,
    };

    const promptData = {
      ...rawData,
      topProducts: topProducts.map((p) => ({
        name: p.name,
        qty: Number(p._sum.quantity || 0),
        revenue: (p._sum.total || new Decimal(0)).toString(),
      })),
      dailySales: dailySales.map((d) => ({
        date: new Date(d.date).toLocaleDateString('ru-RU'),
        total: (d._sum.total || new Decimal(0)).toString(),
      })),
      expenseBreakdown: expenseBreakdown.map((e) => ({
        expenseType: e.expenseType,
        total: (e._sum.amount || new Decimal(0)).toString(),
      })),
    };

    const aiResult = await this.callAi(buildSalesPrompt(promptData));
    const result = { ...aiResult as object, rawData };
    this.setCache(cacheKey, result);
    return result;
  }

  async forecastInventory(userId: string, dto: ForecastInventoryDto): Promise<unknown> {
    const b = await this.getBusiness(userId);
    const cacheKey = `${b.id}:inventory:${dto.daysAhead}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [inventoryItems, usageData] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { businessId: b.id, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.inventoryTransaction.groupBy({
        by: ['inventoryItemId'],
        where: { businessId: b.id, type: 'OUT', date: { gte: thirtyDaysAgo } },
        _sum: { quantity: true },
      }),
    ]);

    const usageMap = new Map(usageData.map((u) => [u.inventoryItemId, Number(u._sum.quantity || 0)]));

    const currentStock = inventoryItems.map((item) => {
      const monthlyUsage = usageMap.get(item.id) || 0;
      const dailyUsage = monthlyUsage / 30;
      const stock = toDecimal(item.currentStock).toNumber();
      const daysRemaining = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : null;
      return {
        name: item.name,
        currentStock: stock.toFixed(2),
        minStockLevel: toDecimal(item.minStockLevel).toFixed(2),
        unit: item.unit,
        avgCost: toDecimal(item.avgCost).toFixed(2),
        daysRemaining,
      };
    });

    const topUsedItems = usageData
      .map((u) => {
        const item = inventoryItems.find((i) => i.id === u.inventoryItemId);
        if (!item) return null;
        return { name: item.name, totalUsed: Number(u._sum.quantity || 0).toFixed(2), unit: item.unit };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, bItem) => Number(bItem.totalUsed) - Number(a.totalUsed))
      .slice(0, 10);

    const promptData = { daysAhead: dto.daysAhead, currentStock, topUsedItems };
    const aiResult = await this.callAi(buildInventoryPrompt(promptData));
    const result = { ...aiResult as object, rawData: { currentStock } };
    this.setCache(cacheKey, result);
    return result;
  }

  async getAdvice(userId: string, dto: AskAdvisorDto): Promise<unknown> {
    const b = await this.getBusiness(userId);
    const cacheKey = `${b.id}:advisor:weekly`;
    if (!dto.question) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [salesAgg, expAgg, topProducts, inventoryItems, usageData, fixedExpenses] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: b.id, status: 'COMPLETED', date: { gte: thirtyDaysAgo } },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId: b.id, date: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: { businessId: b.id, status: 'COMPLETED', date: { gte: thirtyDaysAgo } } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      this.prisma.inventoryItem.findMany({
        where: { businessId: b.id, isActive: true },
        select: { id: true, name: true, currentStock: true, unit: true },
      }),
      this.prisma.inventoryTransaction.groupBy({
        by: ['inventoryItemId'],
        where: { businessId: b.id, type: 'OUT', date: { gte: thirtyDaysAgo } },
        _sum: { quantity: true },
      }),
      this.prisma.fixedExpense.findMany({
        where: { businessId: b.id }
      })
    ]);

    const itemUsageMap = new Map(usageData.map((u) => [u.inventoryItemId, Number(u._sum.quantity || 0)]));

    const totalSales = toDecimal(salesAgg._sum.total || 0);
    const totalExpenses = toDecimal(expAgg._sum.amount || 0);

    const sortedProducts = [...topProducts].sort((a, bP) => Number(bP._sum.total || 0) - Number(a._sum.total || 0));

    const inventoryWithDays = inventoryItems.map((item) => {
      const monthlyUsage = itemUsageMap.get(item.id) || 0;
      const dailyUsage = monthlyUsage / 30;
      const stock = toDecimal(item.currentStock).toNumber();
      const daysRemaining = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : null;
      return { name: item.name, currentStock: stock.toFixed(2), unit: item.unit, daysRemaining };
    });

    const rawData = {
      monthlySales: totalSales.toFixed(2),
      netProfit: totalSales.minus(totalExpenses).toFixed(2),
    };

    const promptData = {
      monthlySales: totalSales.toFixed(2),
      monthlyExpenses: totalExpenses.toFixed(2),
      netProfit: totalSales.minus(totalExpenses).toFixed(2),
      topProducts: sortedProducts.slice(0, 5).map((p) => ({
        name: p.name,
        revenue: (p._sum.total || new Decimal(0)).toString(),
      })),
      lowProducts: sortedProducts.slice(-3).map((p) => ({
        name: p.name,
        revenue: (p._sum.total || new Decimal(0)).toString(),
      })),
      inventory: inventoryWithDays,
      fixedExpenses: fixedExpenses.map(fe => ({
        name: fe.name,
        amount: toDecimal(fe.amount).toString(),
        period: fe.period
      })),
      question: dto.question,
    };

    // Save user question if present
    if (dto.question) {
      await this.saveChatMessage(userId, 'user', dto.question);
    }

    const aiResult = await this.callAi(buildAdvisorPrompt(promptData)) as any;
    
    // Save AI response to history
    const aiContent = aiResult.answerToQuestion || aiResult.weeklyAdvice;
    if (aiContent) {
      await this.saveChatMessage(userId, 'ai', aiContent);
    }

    // Execute actions if present
    if (aiResult.actions && Array.isArray(aiResult.actions)) {
      for (const action of aiResult.actions) {
        await this.executeAiAction(b.id, userId, action);
      }
    } else if (aiResult.action) {
      await this.executeAiAction(b.id, userId, aiResult.action);
    }

    const result = { ...aiResult as object, rawData };
    if (!dto.question) this.setCache(cacheKey, result);
    return result;
  }

  private async executeAiAction(businessId: string, userId: string, action: any): Promise<void> {
    try {
      this.logger.log(`Executing AI Action: ${action.type} for business ${businessId}`);
      
      if (action.type === 'UPDATE_INVENTORY') {
        const { itemName, quantity, type } = action.params;
        const item = await this.prisma.inventoryItem.findFirst({
          where: { businessId, name: { contains: itemName, mode: 'insensitive' } }
        });

        if (item) {
          const stockBefore = toDecimal(item.currentStock);
          const qty = new Decimal(quantity);
          const newStock = type === 'IN' 
            ? stockBefore.plus(qty) 
            : stockBefore.minus(qty);

          await this.prisma.$transaction([
            this.prisma.inventoryItem.update({
              where: { id: item.id },
              data: { currentStock: newStock }
            }),
            this.prisma.inventoryTransaction.create({
              data: {
                businessId,
                inventoryItemId: item.id,
                type: type === 'IN' ? 'IN' : 'OUT',
                quantity: qty,
                unitCost: toDecimal(item.avgCost),
                totalCost: qty.mul(toDecimal(item.avgCost)),
                stockBefore: stockBefore,
                stockAfter: newStock,
                reason: `AI Action: ${action.reason || 'Auto-update'}`
              }
            })
          ]);
          this.logger.log(`Successfully updated inventory for ${item.name}`);
        }
      } else if (action.type === 'PROCESS_DAILY_REPORT') {
        const { sales, fixedExpenses, dailyExpenses } = action.params;
        let totalSales = new Decimal(0);
        let totalExp = new Decimal(0);
        
        // 1. Process Sales for each location
        for (const s of sales) {
          const amount = new Decimal(s.amount);
          totalSales = totalSales.plus(amount);
          await this.prisma.sale.create({
            data: {
              businessId,
              saleNumber: `AI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              subtotal: amount,
              total: amount,
              notes: `AI Daily Sale: ${s.location}`,
              date: new Date(),
              status: 'COMPLETED'
            }
          });
        }

        // 2. Process Fixed Expenses (Daily portion)
        if (fixedExpenses) {
          for (const fe of fixedExpenses) {
            const dailyAmount = new Decimal(fe.monthlyAmount).div(30);
            totalExp = totalExp.plus(dailyAmount);
            await this.prisma.expense.create({
              data: {
                businessId,
                amount: dailyAmount,
                expenseType: 'FIXED',
                description: `Daily portion of ${fe.name} (${fe.monthlyAmount}/mo)`,
                date: new Date()
              }
            });
          }
        }

        // 3. Process Specific Daily Expenses
        if (dailyExpenses) {
          for (const de of dailyExpenses) {
            const amount = new Decimal(de.amount);
            totalExp = totalExp.plus(amount);
            await this.prisma.expense.create({
              data: {
                businessId,
                amount: amount,
                expenseType: 'VARIABLE',
                description: de.name,
                date: new Date()
              }
            });
          }
        }

        // 4. Update/Create Daily Report Summary
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await this.prisma.dailyReport.upsert({
          where: {
            businessId_date: {
              businessId,
              date: today
            }
          },
          update: {
            totalSales: { increment: totalSales },
            totalExpenses: { increment: totalExp },
            remaining: { increment: totalSales.minus(totalExp) }
          },
          create: {
            businessId,
            userId,
            date: today,
            totalSales: totalSales,
            totalExpenses: totalExp,
            remaining: totalSales.minus(totalExp),
            notes: 'AI Automated Daily Report'
          }
        });

        this.logger.log(`Successfully processed daily report and updated summary for business ${businessId}`);
      }
    } catch (e) {
      this.logger.error(`Failed to execute AI action: ${e.message}`);
    }
  }

  async getChatHistory(userId: string) {
    const b = await this.getBusiness(userId);
    return this.prisma.aiMessage.findMany({
      where: { businessId: b.id },
      orderBy: { createdAt: 'asc' },
      take: 100 // Last 100 messages
    });
  }

  async saveChatMessage(userId: string, role: string, content: string) {
    const b = await this.getBusiness(userId);
    return this.prisma.aiMessage.create({
      data: {
        businessId: b.id,
        role,
        content
      }
    });
  }
}
