import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toDecimal } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parseMonth } from '../../common/utils/date.util';
import Decimal from 'decimal.js';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  private dateRange(from?: string, to?: string) {
    const start = from ? startOfDay(from) : new Date(0);
    const end = to ? endOfDay(to) : new Date();
    return { start, end };
  }

  async getProfit(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);

    const [income, expenses] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: { businessId: b.id, type: 'INCOME', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { businessId: b.id, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = toDecimal(income._sum.amount || 0);
    const totalExpenses = toDecimal(expenses._sum.amount || 0);
    const netProfit = totalIncome.minus(totalExpenses);

    const expenseBreakdown = await this.prisma.expense.groupBy({
      by: ['expenseType'],
      where: { businessId: b.id, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    return {
      period: { from: start, to: end },
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      profitMargin: totalIncome.isZero() ? '0.00' : netProfit.dividedBy(totalIncome).times(100).toFixed(2),
      expenseBreakdown,
    };
  }

  async getCashflow(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: { businessId: b.id, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    let running = new Decimal(0);
    const cashflow = transactions.map((t) => {
      const amount = toDecimal(t.amount);
      running = t.type === 'INCOME' ? running.plus(amount) : running.minus(amount);
      return { ...t, runningBalance: running.toFixed(2) };
    });

    return { transactions: cashflow, finalBalance: running.toFixed(2) };
  }

  async getCogs(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);

    const cogs = await this.prisma.inventoryTransaction.aggregate({
      where: { businessId: b.id, type: 'OUT', reason: 'SALE', date: { gte: start, lte: end } },
      _sum: { totalCost: true },
    });

    const sales = await this.prisma.sale.aggregate({
      where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
      _sum: { total: true },
    });

    const totalCogs = toDecimal(cogs._sum.totalCost || 0);
    const totalSales = toDecimal(sales._sum.total || 0);
    const grossProfit = totalSales.minus(totalCogs);

    return {
      totalSales: totalSales.toFixed(2),
      totalCogs: totalCogs.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      grossMargin: totalSales.isZero() ? '0.00' : grossProfit.dividedBy(totalSales).times(100).toFixed(2),
    };
  }

  async getDailySummary(userId: string, date?: string) {
    const b = await this.getBusiness(userId);
    const targetDate = date ? new Date(date) : new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const [sales, expenses, topProducts] = await Promise.all([
      this.prisma.sale.findMany({
        where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
        include: { items: true },
      }),
      this.prisma.expense.findMany({ where: { businessId: b.id, date: { gte: start, lte: end } } }),
      this.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const totalSales = sales.reduce((acc, s) => acc.plus(toDecimal(s.total)), new Decimal(0));
    const totalExpenses = expenses.reduce((acc, e) => acc.plus(toDecimal(e.amount)), new Decimal(0));

    return {
      date: targetDate,
      salesCount: sales.length,
      totalSales: totalSales.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: totalSales.minus(totalExpenses).toFixed(2),
      topProducts,
    };
  }

  async getMonthly(userId: string, year: number, month: number) {
    const b = await this.getBusiness(userId);
    const start = startOfMonth(year, month);
    const end = endOfMonth(year, month);

    const [income, expenses, salesByDay, expenseBreakdown] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
        _sum: { total: true, cashAmount: true, cardAmount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { businessId: b.id, date: { gte: start, lte: end } },
        _sum: { amount: true },
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

    const totalIncome = toDecimal(income._sum.total || 0);
    const totalExpenses = toDecimal(expenses._sum.amount || 0);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: totalIncome.minus(totalExpenses).toFixed(2),
      salesCount: income._count,
      cashSales: income._sum.cashAmount?.toString() || '0',
      cardSales: income._sum.cardAmount?.toString() || '0',
      dailySales: salesByDay,
      expenseBreakdown,
    };
  }

  async getTopProducts(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);
    const rows = await this.prisma.saleItem.groupBy({
      by: ['productId', 'name'],
      where: { sale: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } } },
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 20,
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      productId: r.productId,
      name: r.name,
      qtySold: Number(r._sum.quantity || 0),
      revenue: r._sum.total?.toString() || '0',
    }));
  }

  async getSupplierBreakdown(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);
    const purchases = await this.prisma.supplierPurchase.groupBy({
      by: ['supplierId'],
      where: { businessId: b.id, date: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: true,
    });
    const suppliers = await this.prisma.supplier.findMany({ where: { businessId: b.id } });
    const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));
    const grandTotal = purchases.reduce((acc, p) => acc + Number(p._sum.totalAmount || 0), 0);
    return purchases.map((p) => {
      const total = p._sum.totalAmount?.toString() || '0';
      return {
        supplierId: p.supplierId,
        name: supplierMap[p.supplierId]?.name || 'Unknown',
        total,
        purchaseCount: p._count,
        percentage: grandTotal > 0 ? ((Number(total) / grandTotal) * 100).toFixed(1) : '0',
      };
    });
  }

  async getHotHours(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const { start, end } = this.dateRange(from, to);
    const sales = await this.prisma.sale.findMany({
      where: { businessId: b.id, status: 'COMPLETED', date: { gte: start, lte: end } },
      select: { date: true, total: true },
    });
    const hourMap: Record<number, { count: number; revenue: Decimal }> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = { count: 0, revenue: new Decimal(0) };
    for (const s of sales) {
      const h = new Date(s.date).getHours();
      hourMap[h].count++;
      hourMap[h].revenue = hourMap[h].revenue.plus(toDecimal(s.total));
    }
    return Object.entries(hourMap).map(([h, d]) => ({
      hour: parseInt(h),
      count: d.count,
      revenue: d.revenue.toFixed(2),
    }));
  }

  async getPayrollReport(userId: string, month: string) {
    const b = await this.getBusiness(userId);
    const { year, month: m } = parseMonth(month);
    const start = startOfMonth(year, m);
    const end = endOfMonth(year, m);

    const payments = await this.prisma.employeePayment.findMany({
      where: { period: month, employee: { businessId: b.id } },
      include: { employee: true },
      orderBy: { paidAt: 'desc' },
    });

    const byEmployee = payments.reduce((acc: any, p) => {
      if (!acc[p.employeeId]) acc[p.employeeId] = { employee: p.employee, payments: [], total: new Decimal(0) };
      acc[p.employeeId].payments.push(p);
      acc[p.employeeId].total = acc[p.employeeId].total.plus(toDecimal(p.amount));
      return acc;
    }, {});

    return {
      month,
      totalPayroll: (Object.values(byEmployee) as any[]).reduce((sum: Decimal, e: any) => sum.plus(e.total), new Decimal(0)).toFixed(2),
      employees: Object.values(byEmployee).map((e: any) => {
        const byType = e.payments.reduce((acc: any, p: any) => {
          const key = p.paymentType as string;
          acc[key] = (acc[key] || new Decimal(0)).plus(toDecimal(p.amount));
          return acc;
        }, {} as Record<string, Decimal>);
        return {
          employeeId: e.employee.id,
          name: e.employee.name,
          baseSalary: (byType['SALARY'] || new Decimal(0)).toFixed(2),
          bonus: (byType['BONUS'] || new Decimal(0)).toFixed(2),
          advances: (byType['ADVANCE'] || new Decimal(0)).toFixed(2),
          fines: (byType['FINE'] || new Decimal(0)).toFixed(2),
          final: e.total.toFixed(2),
        };
      }),
    };
  }

  async exportExcel(userId: string, from?: string, to?: string, type = 'profit'): Promise<Buffer> {
    const data = await this.getProfit(userId, from, to);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value (TJS)', key: 'value', width: 20 },
    ];

    sheet.addRow({ metric: 'Total Income', value: data.totalIncome });
    sheet.addRow({ metric: 'Total Expenses', value: data.totalExpenses });
    sheet.addRow({ metric: 'Net Profit', value: data.netProfit });
    sheet.addRow({ metric: 'Profit Margin %', value: data.profitMargin });

    sheet.addRow({});
    sheet.addRow({ metric: 'Expense Breakdown', value: '' });
    for (const e of data.expenseBreakdown) {
      sheet.addRow({ metric: e.expenseType, value: e._sum.amount?.toString() || '0' });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPdf(userId: string, from?: string, to?: string): Promise<Buffer> {
    const data = await this.getProfit(userId, from, to);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Choco Berry — P&L Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${from || 'all'} to ${to || 'now'}`);
      doc.moveDown();
      doc.text(`Total Income:   ${data.totalIncome} TJS`);
      doc.text(`Total Expenses: ${data.totalExpenses} TJS`);
      doc.text(`Net Profit:     ${data.netProfit} TJS`);
      doc.text(`Profit Margin:  ${data.profitMargin}%`);
      doc.moveDown();
      doc.fontSize(14).text('Expense Breakdown:');
      doc.fontSize(12);
      for (const e of data.expenseBreakdown) {
        doc.text(`  ${e.expenseType}: ${e._sum.amount?.toString() || '0'} TJS`);
      }

      doc.end();
    });
  }
}
