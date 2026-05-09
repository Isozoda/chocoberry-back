import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashboxOpDto } from './dto/cashbox-op.dto';
import { toDecimal } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay } from '../../common/utils/date.util';

@Injectable()
export class CashboxService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  private async getCashbox(businessId: string) {
    const c = await this.prisma.cashbox.findUnique({ where: { businessId } });
    if (!c) throw new NotFoundException('Cashbox not found. Run /business/setup first.');
    return c;
  }

  async get(userId: string) {
    const b = await this.getBusiness(userId);
    const cashbox = await this.getCashbox(b.id);
    const balance = toDecimal(cashbox.balance);
    const cardBalance = toDecimal(cashbox.cardBalance);
    return {
      id: cashbox.id,
      businessId: cashbox.businessId,
      cashBalance: balance.toFixed(2),
      cardBalance: cardBalance.toFixed(2),
      totalBalance: balance.plus(cardBalance).toFixed(2),
      currency: cashbox.currency,
      lastUpdated: cashbox.lastUpdated,
    };
  }

  private async doOperation(userId: string, type: 'IN' | 'OUT' | 'OPEN' | 'CLOSE' | 'ADJUSTMENT', dto: CashboxOpDto) {
    const b = await this.getBusiness(userId);
    const cashbox = await this.getCashbox(b.id);
    const amount = toDecimal(dto.amount);
    const balanceBefore = toDecimal(cashbox.balance);
    const balanceAfter = type === 'IN' || type === 'OPEN' ? balanceBefore.plus(amount) : balanceBefore.minus(amount);

    return this.prisma.$transaction(async (tx) => {
      await tx.cashbox.update({
        where: { businessId: b.id },
        data: { balance: balanceAfter, lastUpdated: new Date() },
      });
      return tx.cashboxOperation.create({
        data: {
          cashboxId: cashbox.id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          description: dto.description,
          referenceId: dto.referenceId,
        },
      });
    });
  }

  async cashIn(userId: string, dto: CashboxOpDto) {
    return this.doOperation(userId, 'IN', dto);
  }

  async cashOut(userId: string, dto: CashboxOpDto) {
    return this.doOperation(userId, 'OUT', dto);
  }

  async open(userId: string, dto: CashboxOpDto) {
    return this.doOperation(userId, 'OPEN', dto);
  }

  async close(userId: string, dto: CashboxOpDto) {
    return this.doOperation(userId, 'CLOSE', dto);
  }

  async getHistory(userId: string, page = 1, limit = 50) {
    const b = await this.getBusiness(userId);
    const cashbox = await this.getCashbox(b.id);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.cashboxOperation.findMany({
        where: { cashboxId: cashbox.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashboxOperation.count({ where: { cashboxId: cashbox.id } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTodayReport(userId: string) {
    const b = await this.getBusiness(userId);
    const cashbox = await this.getCashbox(b.id);
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    const ops = await this.prisma.cashboxOperation.findMany({
      where: { cashboxId: cashbox.id, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    });

    const totalIn = ops.filter((o) => o.type === 'IN' || o.type === 'OPEN').reduce((acc, o) => acc.plus(toDecimal(o.amount)), toDecimal(0));
    const totalOut = ops.filter((o) => o.type === 'OUT' || o.type === 'CLOSE').reduce((acc, o) => acc.plus(toDecimal(o.amount)), toDecimal(0));

    return {
      cashBalance: toDecimal(cashbox.balance).toFixed(2),
      cardBalance: toDecimal(cashbox.cardBalance).toFixed(2),
      totalBalance: toDecimal(cashbox.balance).plus(toDecimal(cashbox.cardBalance)).toFixed(2),
      totalIn: totalIn.toFixed(2),
      totalOut: totalOut.toFixed(2),
      netChange: totalIn.minus(totalOut).toFixed(2),
      operations: ops,
    };
  }
}
