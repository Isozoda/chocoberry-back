import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotifyLowStockDto, NotifyDailyReportDto } from './dto/notify.dto';
import { InventoryService } from '../inventory/inventory.service';
import { toDecimal, multiplyDecimal } from '../../common/utils/decimal.util';

interface BulkDeductItem {
  itemId: string;
  quantity: number;
  unit: string;
}

// unit strings from bot parser → Prisma InventoryUnit enum
const PARSER_UNIT_TO_ENUM: Record<string, string> = {
  кг: 'KG',
  г: 'GRAM',
  шт: 'PIECE',
  л: 'LITER',
  мл: 'ML',
};

function normalizeQtyToItemUnit(qty: number, parsedUnit: string, itemUnit: string): number {
  const fromEnum = PARSER_UNIT_TO_ENUM[parsedUnit] || parsedUnit.toUpperCase();
  if (fromEnum === itemUnit) return qty;
  if (fromEnum === 'KG' && itemUnit === 'GRAM') return qty * 1000;
  if (fromEnum === 'GRAM' && itemUnit === 'KG') return qty / 1000;
  if (fromEnum === 'LITER' && itemUnit === 'ML') return qty * 1000;
  if (fromEnum === 'ML' && itemUnit === 'LITER') return qty / 1000;
  return qty;
}

interface ConnectTokenPayload {
  sub: string;
  purpose: 'telegram-connect';
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly notifyRateLimiter = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.botToken = this.config.get<string>('telegram.botToken') || '';
  }

  generateConnectToken(userId: string): string {
    return this.jwtService.sign({ sub: userId, purpose: 'telegram-connect' }, { expiresIn: '15m' });
  }

  async getConnectLink(userId: string): Promise<{ url: string; token: string }> {
    const token = this.generateConnectToken(userId);
    const botUsername = this.config.get<string>('telegram.botUsername') || 'MoneyMindBot';
    return { url: `https://t.me/${botUsername}?start=${token}`, token };
  }

  async subscribe(dto: SubscribeDto): Promise<{ ok: boolean }> {
    let payload: ConnectTokenPayload;
    try {
      payload = this.jwtService.verify<ConnectTokenPayload>(dto.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired connect token');
    }
    if (payload.purpose !== 'telegram-connect') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: {
        telegramChatId: dto.chatId,
        telegramLinked: true,
        telegramLinkedAt: new Date(),
      },
    });

    await this.sendMessage(
      dto.chatId,
      '✅ Telegram бо MoneyMind пайваст шуд!\n\nАкнун шумо огоҳиҳоро хоҳед дид:\n• 📦 Захираи кам\n• 📊 Ҳисоботи рӯзона\n• 💰 Фурӯши нав',
    );
    this.logger.log(`User ${payload.sub} linked chatId ${dto.chatId}`);
    return { ok: true };
  }

  async unsubscribe(userId: string): Promise<{ ok: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.telegramLinked) throw new NotFoundException('No linked Telegram found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramLinked: false, telegramLinkedAt: null },
    });
    return { ok: true };
  }

  async getStatus(userId: string): Promise<{ linked: boolean; linkedAt?: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { linked: user.telegramLinked, linkedAt: user.telegramLinkedAt ?? undefined };
  }

  async getInventoryStatusByChatId(chatId: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, telegramLinked: true },
    });
    if (!user) throw new NotFoundException('User not linked or found');

    const business = await this.prisma.business.findUnique({
      where: { userId: user.id },
    });
    if (!business) throw new NotFoundException('Business not found for this user');

    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId: business.id, isActive: true },
    });

    // Filter items where current stock <= min stock level
    const lowStockItems = items.filter((item) => {
      const current = Number(item.currentStock);
      const min = Number(item.minStockLevel);
      // If min is 5 and current is 0, it's definitely low stock.
      // We only skip if min is 0 (meaning no minimum set).
      return min > 0 && current <= min;
    });

    console.log(`[TelegramBot] Found ${lowStockItems.length} low stock items for chatId ${chatId}`);
    return lowStockItems;
  }

  async notifyLowStock(dto: NotifyLowStockDto): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: { user: true },
    });
    if (!business?.user?.telegramLinked || !business.user.telegramChatId) return;

    const rateLimitKey = `low-stock:${dto.businessId}`;
    const lastSent = this.notifyRateLimiter.get(rateLimitKey) || 0;
    if (Date.now() - lastSent < 60_000) return;
    this.notifyRateLimiter.set(rateLimitKey, Date.now());

    const lines = dto.items
      .map((i) => `• ${i.name}: ${i.currentStock} ${i.unit} (min: ${i.minStockLevel})`)
      .join('\n');

    const text = `⚠️ *Захира кам аст!*\n\n${lines}\n\n_${business.name}_`;
    await this.sendMessage(business.user.telegramChatId, text, { parse_mode: 'Markdown' });

    await this.prisma.telegramNotification.create({
      data: {
        userId: business.user.id,
        chatId: business.user.telegramChatId,
        type: 'LOW_STOCK',
        message: text,
      },
    });
  }

  async notifyDailyReport(dto: NotifyDailyReportDto): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: { user: true },
    });
    if (!business?.user?.telegramLinked || !business.user.telegramChatId) return;

    const date = dto.date || new Date().toISOString().split('T')[0];
    const text =
      `📊 *Ҳисоботи рӯзона — ${date}*\n\n` +
      `💰 Фурӯш: *${dto.totalSales.toLocaleString()} TJS*\n` +
      `💸 Хароҷот: *${dto.totalExpenses.toLocaleString()} TJS*\n` +
      `✅ Боқимонда: *${dto.remaining.toLocaleString()} TJS*\n\n` +
      `_${business.name}_`;

    await this.sendMessage(business.user.telegramChatId, text, { parse_mode: 'Markdown' });

    await this.prisma.telegramNotification.create({
      data: {
        userId: business.user.id,
        chatId: business.user.telegramChatId,
        type: 'DAILY_REPORT',
        message: text,
      },
    });
  }

  async getInventoryItemsByChatId(chatId: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, telegramLinked: true },
    });
    if (!user) throw new NotFoundException('User not linked');

    const business = await this.prisma.business.findUnique({ where: { userId: user.id } });
    if (!business) throw new NotFoundException('Business not found');

    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        nameRu: true,
        nameTg: true,
        unit: true,
        currentStock: true,
        minStockLevel: true,
      },
      orderBy: { name: 'asc' },
    });

    return { businessId: business.id, items };
  }

  async bulkDeduct(chatId: string, deductItems: BulkDeductItem[], rawMessage?: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, telegramLinked: true },
    });
    if (!user) throw new NotFoundException('User not linked');

    const business = await this.prisma.business.findUnique({ where: { userId: user.id } });
    if (!business) throw new NotFoundException('Business not found');

    const results: Array<{
      id: string;
      name: string;
      unit: string;
      stockBefore: string;
      stockAfter: string;
      quantity: string;
      isLow: boolean;
      minStockLevel: string;
    }> = [];
    const warnings: Array<{ itemId: string; error: string }> = [];

    for (const req of deductItems) {
      const invItem = await this.prisma.inventoryItem.findFirst({
        where: { id: req.itemId, businessId: business.id, isActive: true },
      });

      if (!invItem) {
        warnings.push({ itemId: req.itemId, error: 'Топилмад' });
        continue;
      }

      const normalizedQty = normalizeQtyToItemUnit(req.quantity, req.unit, invItem.unit as string);
      const qty = toDecimal(normalizedQty);
      const stockBefore = toDecimal(invItem.currentStock);

      if (stockBefore.lessThan(qty)) {
        warnings.push({
          itemId: req.itemId,
          error: `${invItem.name}: захира кам аст (${stockBefore.toFixed(2)})`,
        });
        continue;
      }

      const stockAfter = stockBefore.minus(qty);

      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { currentStock: stockAfter },
          });
          await tx.inventoryTransaction.create({
            data: {
              businessId: business.id,
              inventoryItemId: invItem.id,
              type: 'OUT',
              quantity: qty,
              unitCost: toDecimal(invItem.avgCost),
              totalCost: multiplyDecimal(qty, invItem.avgCost),
              stockBefore,
              stockAfter,
              reason: 'ASHAN_DEDUCT',
              notes: rawMessage ? rawMessage.slice(0, 500) : 'Ашан харид',
            },
          });
        });

        const minStock = toDecimal(invItem.minStockLevel);
        const isLow = minStock.greaterThan(0) && stockAfter.lessThanOrEqualTo(minStock);

        if (isLow) {
          await this.notifyLowStock({
            businessId: business.id,
            items: [
              {
                name: invItem.name,
                currentStock: stockAfter.toFixed(2),
                minStockLevel: invItem.minStockLevel.toString(),
                unit: invItem.unit,
              },
            ],
          }).catch(() => {});
        }

        results.push({
          id: invItem.id,
          name: invItem.name,
          unit: invItem.unit as string,
          stockBefore: stockBefore.toFixed(2),
          stockAfter: stockAfter.toFixed(2),
          quantity: qty.toFixed(2),
          isLow,
          minStockLevel: invItem.minStockLevel.toString(),
        });
      } catch (err) {
        this.logger.error(`bulkDeduct error for item ${invItem.id}:`, err);
        warnings.push({ itemId: req.itemId, error: `${invItem.name}: хато рӯй дод` });
      }
    }

    return { results, warnings };
  }

  async parseDailyReport(rawText: string): Promise<{
    date: string | null;
    openingBalance: number;
    closingBalance: number;
    totalExpenses: number;
    items: Array<{ name: string; amount: number; category: string }>;
  }> {
    const lines = rawText
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let date: string | null = null;
    let openingBalance = 0;
    let closingBalance = 0;
    const items: Array<{ name: string; amount: number; category: string }> = [];

    const autoCategories: Record<string, string> = {
      ашан: 'shopping',
      сиёма: 'shopping',
      клубника: 'ingredients',
      шоколад: 'ingredients',
      намк: 'ingredients',
      банан: 'ingredients',
      сливки: 'ingredients',
      баҳрулло: 'salary',
      дилшод: 'salary',
      саф: 'salary',
      трайфл: 'production',
      'дом печат': 'other',
      масрафҳо: 'misc',
      масрафхо: 'misc',
    };

    for (const line of lines) {
      const lower = line.toLowerCase();

      // БРР — дата ҳисобот
      const brrMatch = line.match(/^БРР\s+(\d{2})\.(\d{2})\.(\d{4})/i);
      if (brrMatch) {
        date = `${brrMatch[3]}-${brrMatch[2]}-${brrMatch[1]}`;
        continue;
      }

      // ТО — тавоноии оғоз (opening balance)
      const toMatch = line.match(/^ТО\s+([\d\s]+)/i);
      if (toMatch) {
        openingBalance = parseInt(toMatch[1].replace(/\s+/g, ''), 10) || 0;
        continue;
      }

      // Монд — моданда (closing balance)
      const mondMatch = line.match(/^Монд[:\s]+([\d\s]+)/i);
      if (mondMatch) {
        closingBalance = parseInt(mondMatch[1].replace(/\s+/g, ''), 10) || 0;
        continue;
      }

      // Дигар сатрҳо — хароҷот (ном + рақам)
      const expMatch = line.match(/^(.+?)\s+([\d\s]{3,})$/);
      if (expMatch) {
        const name = expMatch[1].trim();
        const amount = parseInt(expMatch[2].replace(/\s+/g, ''), 10) || 0;
        if (amount > 0 && name.length > 1) {
          const cat = autoCategories[name.toLowerCase()] || 'other';
          items.push({ name, amount, category: cat });
        }
      }
    }

    const totalExpenses =
      openingBalance > 0 && closingBalance > 0
        ? openingBalance - closingBalance
        : items.reduce((s, i) => s + i.amount, 0);

    return { date, openingBalance, closingBalance, totalExpenses, items };
  }

  async saveTelegramDailyReport(
    chatId: string,
    data: {
      date: string;
      openingBalance: number;
      closingBalance: number;
      totalExpenses: number;
      rawText: string;
      items: Array<{ name: string; amount: number; category: string }>;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, telegramLinked: true },
    });
    if (!user) throw new Error('User not linked');

    const business = await this.prisma.business.findUnique({ where: { userId: user.id } });
    if (!business) throw new Error('Business not found');

    const dateObj = new Date(data.date);

    const existing = await this.prisma.telegramDailyReport.findUnique({
      where: { businessId_date: { businessId: business.id, date: dateObj } },
    });

    if (existing) {
      await this.prisma.telegramDailyReportItem.deleteMany({ where: { reportId: existing.id } });
      await this.prisma.telegramDailyReport.update({
        where: { id: existing.id },
        data: {
          openingBalance: toDecimal(data.openingBalance),
          closingBalance: toDecimal(data.closingBalance),
          totalExpenses: toDecimal(data.totalExpenses),
          rawText: data.rawText,
          items: {
            create: data.items.map((i) => ({
              name: i.name,
              amount: toDecimal(i.amount),
              category: i.category,
            })),
          },
        },
      });
      return existing.id;
    }

    const report = await this.prisma.telegramDailyReport.create({
      data: {
        businessId: business.id,
        date: dateObj,
        openingBalance: toDecimal(data.openingBalance),
        closingBalance: toDecimal(data.closingBalance),
        totalExpenses: toDecimal(data.totalExpenses),
        rawText: data.rawText,
        items: {
          create: data.items.map((i) => ({
            name: i.name,
            amount: toDecimal(i.amount),
            category: i.category,
          })),
        },
      },
    });
    return report.id;
  }

  async getLatestTelegramDailyReport(userId: string) {
    const business = await this.prisma.business.findUnique({ where: { userId } });
    if (!business) return null;
    return this.prisma.telegramDailyReport.findFirst({
      where: { businessId: business.id },
      orderBy: { date: 'desc' },
      include: { items: true },
    });
  }

  async notifyDueSoonFixedExpenses(): Promise<void> {
    const businesses = await this.prisma.business.findMany({
      include: { user: true },
    });

    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + 3);

    for (const business of businesses) {
      if (!business.user?.telegramLinked || !business.user?.telegramChatId) continue;

      const dueSoon = await this.prisma.fixedExpense.findMany({
        where: {
          businessId: business.id,
          isPaid: false,
          dueDate: { gte: now, lte: deadline },
        },
        orderBy: { dueDate: 'asc' },
      });

      if (dueSoon.length === 0) continue;

      const lines = dueSoon
        .map((e) => {
          const dueStr = e.dueDate.toLocaleDateString('ru-RU');
          return `• ${e.name}: ${Number(e.amount).toLocaleString()} ${e.currency} (${dueStr})`;
        })
        .join('\n');

      const daysLeft = Math.max(
        1,
        Math.ceil((dueSoon[0].dueDate.getTime() - now.getTime()) / 86400000),
      );
      const text =
        `⚠️ *Огоҳии хароҷот*\n\n` +
        `Хароҷоти зерин ҳанӯз пардохта нашудааст:\n${lines}\n\n` +
        `📅 Муҳлат: *${daysLeft} рӯз* дигар монд!`;

      await this.sendMessage(business.user.telegramChatId, text, { parse_mode: 'Markdown' });
    }
  }

  async sendMessage(
    chatId: string,
    text: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — skipping sendMessage');
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, ...extra }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram API error ${res.status}: ${body}`);
      }
    } catch (err) {
      this.logger.error('Failed to send Telegram message', err);
    }
  }
}
