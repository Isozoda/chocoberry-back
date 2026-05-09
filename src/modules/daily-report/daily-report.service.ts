import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { toDecimal, addDecimal, maxDecimal } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay } from '../../common/utils/date.util';
import Decimal from 'decimal.js';

@Injectable()
export class DailyReportService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async create(userId: string, dto: CreateDailyReportDto) {
    const b = await this.getBusiness(userId);
    const reportDate = new Date(dto.date);

    const existing = await this.prisma.dailyReport.findUnique({
      where: { businessId_date: { businessId: b.id, date: reportDate } },
    });
    if (existing) throw new ConflictException('Daily report for this date already exists');

    const totalSales = toDecimal(dto.totalSales);
    const extraIncome = toDecimal(dto.extraIncome || 0);
    const totalIncome = totalSales.plus(extraIncome);

    const suppliersTotal = (dto.suppliers || []).reduce(
      (acc, s) => acc.plus(toDecimal(s.amount)),
      new Decimal(0),
    );
    const operationalExp = toDecimal(dto.operationalExp || 0);
    const consumablesExp = toDecimal(dto.consumablesExp || 0);
    const ownerDraws = (dto.draws || []).reduce(
      (acc, d) => acc.plus(toDecimal(d.amount)),
      new Decimal(0),
    );
    const inventoryExp = suppliersTotal;
    const totalExpenses = suppliersTotal.plus(operationalExp).plus(consumablesExp).plus(ownerDraws);

    const remaining = toDecimal(dto.remaining || 0);
    const charityAmount = maxDecimal(
      new Decimal(0),
      totalIncome.minus(totalExpenses).minus(remaining),
    );

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.create({
        data: {
          businessId: b.id,
          userId,
          date: reportDate,
          totalSales,
          cashSales: toDecimal(dto.cashSales || 0),
          cardSales: toDecimal(dto.cardSales || 0),
          extraIncome,
          totalIncome,
          suppliersTotal,
          operationalExp,
          consumablesExp,
          ownerDraws,
          inventoryExp,
          totalExpenses,
          charityAmount,
          remaining,
          notes: dto.notes,
          suppliers: {
            create: (dto.suppliers || []).map((s) => ({
              supplierId: s.supplierId || null,
              name: s.name,
              amount: toDecimal(s.amount),
            })),
          },
          draws: {
            create: (dto.draws || []).map((d) => ({
              employeeId: d.employeeId || null,
              ownerName: d.ownerName,
              amount: toDecimal(d.amount),
              note: d.note,
            })),
          },
        },
        include: { suppliers: true, draws: true, lines: true },
      });

      return report;
    });
  }

  async findAll(userId: string, from?: string, to?: string, page = 1, limit = 30) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        include: { suppliers: true, draws: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dailyReport.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getToday(userId: string) {
    const b = await this.getBusiness(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const report = await this.prisma.dailyReport.findUnique({
      where: { businessId_date: { businessId: b.id, date: today } },
      include: { suppliers: true, draws: true, lines: true },
    });
    if (!report) {
      // Auto-compute from actual data
      return this.computeAutoReport(b.id, today);
    }
    return report;
  }

  private async computeAutoReport(businessId: string, date: Date) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId, date: { gte: start, lte: end }, status: 'COMPLETED' },
        _sum: { total: true, cashAmount: true, cardAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    return {
      date,
      totalSales: salesAgg._sum.total || 0,
      cashSales: salesAgg._sum.cashAmount || 0,
      cardSales: salesAgg._sum.cardAmount || 0,
      totalExpenses: expensesAgg._sum.amount || 0,
      isAutoComputed: true,
    };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const r = await this.prisma.dailyReport.findFirst({
      where: { id, businessId: b.id },
      include: { suppliers: true, draws: true, lines: true },
    });
    if (!r) throw new NotFoundException('Daily report not found');
    return r;
  }

  async update(userId: string, id: string, dto: Partial<CreateDailyReportDto>) {
    const b = await this.getBusiness(userId);
    const r = await this.prisma.dailyReport.findFirst({ where: { id, businessId: b.id } });
    if (!r) throw new NotFoundException('Daily report not found');
    if (r.isFinalized) throw new BadRequestException('Report is finalized and cannot be edited');
    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.remaining !== undefined && { remaining: toDecimal(dto.remaining) }),
      },
    });
  }

  async getSummary(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const r = await this.prisma.dailyReport.findFirst({
      where: { id, businessId: b.id },
      include: { suppliers: true, draws: true },
    });
    if (!r) throw new NotFoundException('Daily report not found');

    return {
      date: r.date,
      totalIncome: r.totalIncome,
      totalExpenses: r.totalExpenses,
      charityAmount: r.charityAmount,
      remaining: r.remaining,
      profit: toDecimal(r.totalIncome)
        .minus(toDecimal(r.totalExpenses))
        .minus(toDecimal(r.charityAmount))
        .toFixed(2),
      suppliers: r.suppliers,
      ownerDraws: r.draws,
    };
  }

  async finalize(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const r = await this.prisma.dailyReport.findFirst({ where: { id, businessId: b.id } });
    if (!r) throw new NotFoundException('Daily report not found');
    if (r.isFinalized) throw new ConflictException('Already finalized');
    return this.prisma.dailyReport.update({ where: { id }, data: { isFinalized: true } });
  }
}
