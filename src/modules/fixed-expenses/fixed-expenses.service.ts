import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { toDecimal } from '../../common/utils/decimal.util';
import { startOfMonth, endOfMonth } from '../../common/utils/date.util';

@Injectable()
export class FixedExpensesService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string, month?: string, isPaid?: string) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.dueDate = {
        gte: startOfMonth(year, m),
        lte: endOfMonth(year, m),
      };
    }

    if (isPaid !== undefined && isPaid !== '') {
      where.isPaid = isPaid === 'true';
    }

    const items = await this.prisma.fixedExpense.findMany({
      where,
      orderBy: [{ isPaid: 'asc' }, { dueDate: 'asc' }],
    });

    return items;
  }

  async getSummary(userId: string, month?: string) {
    const b = await this.getBusiness(userId);
    const now = new Date();
    const year = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const m = month ? parseInt(month.split('-')[1]) : now.getMonth() + 1;

    const where = {
      businessId: b.id,
      dueDate: {
        gte: startOfMonth(year, m),
        lte: endOfMonth(year, m),
      },
    };

    const all = await this.prisma.fixedExpense.findMany({ where });
    const totalPaid = all
      .filter((e) => e.isPaid)
      .reduce((s, e) => s + toDecimal(e.amount).toNumber(), 0);
    const totalPending = all
      .filter((e) => !e.isPaid)
      .reduce((s, e) => s + toDecimal(e.amount).toNumber(), 0);

    return {
      totalPaid: toDecimal(totalPaid).toFixed(2),
      totalPending: toDecimal(totalPending).toFixed(2),
      count: all.length,
      paidCount: all.filter((e) => e.isPaid).length,
    };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.fixedExpense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Fixed expense not found');
    return e;
  }

  async create(userId: string, dto: CreateFixedExpenseDto) {
    const b = await this.getBusiness(userId);
    return this.prisma.fixedExpense.create({
      data: {
        businessId: b.id,
        name: dto.name,
        category: dto.category,
        amount: toDecimal(dto.amount),
        currency: dto.currency || 'TJS',
        period: dto.period,
        dueDate: new Date(dto.dueDate),
        isPaid: dto.isPaid ?? false,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        note: dto.note,
      },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateFixedExpenseDto>) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.fixedExpense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Fixed expense not found');
    return this.prisma.fixedExpense.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: toDecimal(dto.amount) }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.isPaid !== undefined && { isPaid: dto.isPaid }),
        ...(dto.paidAt !== undefined && { paidAt: dto.paidAt ? new Date(dto.paidAt) : null }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    });
  }

  async markPaid(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.fixedExpense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Fixed expense not found');
    return this.prisma.fixedExpense.update({
      where: { id },
      data: { isPaid: true, paidAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.fixedExpense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Fixed expense not found');
    return this.prisma.fixedExpense.delete({ where: { id } });
  }

  async getDueSoonUnpaid(businessId: string, daysAhead = 3) {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + daysAhead);
    return this.prisma.fixedExpense.findMany({
      where: {
        businessId,
        isPaid: false,
        dueDate: { gte: now, lte: deadline },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
