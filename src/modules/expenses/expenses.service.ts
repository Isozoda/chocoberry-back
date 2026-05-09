import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { toDecimal } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay } from '../../common/utils/date.util';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string, type?: string, from?: string, to?: string, page = 1, limit = 50) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id };
    if (type) where.expenseType = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = startOfDay(from);
      if (to) where.date.lte = endOfDay(to);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: true, employee: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.expense.findFirst({
      where: { id, businessId: b.id },
      include: { category: true, employee: true },
    });
    if (!e) throw new NotFoundException('Expense not found');
    return e;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    const b = await this.getBusiness(userId);
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          businessId: b.id,
          categoryId: dto.categoryId || null,
          expenseType: dto.expenseType,
          amount: toDecimal(dto.amount),
          description: dto.description,
          vendor: dto.vendor,
          employeeId: dto.employeeId || null,
          paymentMethod: dto.paymentMethod || 'CASH',
          isPaid: true,
          date: dto.date ? new Date(dto.date) : new Date(),
        },
      });

      await tx.financialTransaction.create({
        data: {
          businessId: b.id,
          type: 'EXPENSE',
          amount: toDecimal(dto.amount),
          description: dto.description || `${dto.expenseType} expense`,
          referenceId: expense.id,
          refType: 'EXPENSE',
        },
      });

      const cashbox = await tx.cashbox.findUnique({ where: { businessId: b.id } });
      if (cashbox && dto.paymentMethod !== 'CARD') {
        const newBalance = toDecimal(cashbox.balance).minus(toDecimal(dto.amount));
        await tx.cashbox.update({
          where: { businessId: b.id },
          data: { balance: newBalance, lastUpdated: new Date() },
        });
        await tx.cashboxOperation.create({
          data: {
            cashboxId: cashbox.id,
            type: 'OUT',
            amount: toDecimal(dto.amount),
            balanceBefore: toDecimal(cashbox.balance),
            balanceAfter: newBalance,
            description: dto.description || `${dto.expenseType} expense`,
            referenceId: expense.id,
          },
        });
      }

      return expense;
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateExpenseDto>) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.expense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Expense not found');
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: toDecimal(dto.amount) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.expenseType && { expenseType: dto.expenseType }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.expense.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Expense not found');
    return this.prisma.expense.delete({ where: { id } });
  }

  async getCategories(userId: string, expenseType?: string) {
    const b = await this.getBusiness(userId);
    return this.prisma.category.findMany({
      where: {
        businessId: b.id,
        type: 'EXPENSE',
        ...(expenseType && { expenseType: expenseType as any }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBreakdown(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = startOfDay(from);
      if (to) where.date.lte = endOfDay(to);
    }
    const rows = await this.prisma.expense.groupBy({
      by: ['expenseType'],
      where,
      _sum: { amount: true },
      _count: true,
    });
    return rows.map((r) => ({
      type: r.expenseType,
      total: toDecimal(r._sum.amount || 0).toFixed(2),
      count: r._count,
    }));
  }
}
