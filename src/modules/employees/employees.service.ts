import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { PayEmployeeDto } from './dto/pay-employee.dto';
import { CreateFineDto } from './dto/create-fine.dto';
import { CalcPayrollDto } from './dto/calc-payroll.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { toDecimal } from '../../common/utils/decimal.util';
import { startOfMonth, endOfMonth, parseMonth } from '../../common/utils/date.util';
import Decimal from 'decimal.js';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string) {
    const b = await this.getBusiness(userId);
    return this.prisma.employee.findMany({ where: { businessId: b.id, isActive: true }, orderBy: { name: 'asc' } });
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return e;
  }

  async create(userId: string, dto: CreateEmployeeDto) {
    const b = await this.getBusiness(userId);
    return this.prisma.employee.create({
      data: {
        businessId: b.id,
        name: dto.name,
        role: dto.role,
        isOwner: dto.isOwner || false,
        isConsumableBuyer: dto.isConsumableBuyer || false,
        phone: dto.phone,
        salary: toDecimal(dto.salary || 0),
        salaryType: dto.salaryType || 'MONTHLY',
        bonusPercent: toDecimal(dto.bonusPercent || 0),
      },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateEmployeeDto>) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.isOwner !== undefined && { isOwner: dto.isOwner }),
        ...(dto.isConsumableBuyer !== undefined && { isConsumableBuyer: dto.isConsumableBuyer }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.salary !== undefined && { salary: toDecimal(dto.salary) }),
        ...(dto.salaryType && { salaryType: dto.salaryType }),
        ...(dto.bonusPercent !== undefined && { bonusPercent: toDecimal(dto.bonusPercent) }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } });
  }

  async pay(userId: string, employeeId: string, dto: PayEmployeeDto) {
    const b = await this.getBusiness(userId);
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          businessId: b.id,
          expenseType: dto.paymentType === 'OWNER_DRAW' ? 'OWNER_DRAW' : 'PAYROLL',
          amount: toDecimal(dto.amount),
          description: `${dto.paymentType || 'SALARY'} — ${employee.name}`,
          employeeId,
          paymentMethod: 'CASH',
          isPaid: true,
          date: new Date(),
        },
      });

      const payment = await tx.employeePayment.create({
        data: {
          employeeId,
          expenseId: expense.id,
          amount: toDecimal(dto.amount),
          paymentType: dto.paymentType || 'SALARY',
          period: dto.period,
          notes: dto.notes,
        },
      });

      await tx.financialTransaction.create({
        data: {
          businessId: b.id,
          type: 'EXPENSE',
          amount: toDecimal(dto.amount),
          description: `Payment to ${employee.name}`,
          referenceId: payment.id,
          refType: 'EMPLOYEE_PAYMENT',
        },
      });

      const cashbox = await tx.cashbox.findUnique({ where: { businessId: b.id } });
      if (cashbox) {
        const newBalance = toDecimal(cashbox.balance).minus(toDecimal(dto.amount));
        await tx.cashbox.update({ where: { businessId: b.id }, data: { balance: newBalance, lastUpdated: new Date() } });
        await tx.cashboxOperation.create({
          data: {
            cashboxId: cashbox.id,
            type: 'OUT',
            amount: toDecimal(dto.amount),
            balanceBefore: toDecimal(cashbox.balance),
            balanceAfter: newBalance,
            description: `Payment to ${employee.name}`,
            referenceId: payment.id,
          },
        });
      }

      return payment;
    });
  }

  async getPayments(userId: string, employeeId: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.employeePayment.findMany({ where: { employeeId }, orderBy: { paidAt: 'desc' } });
  }

  async createFine(userId: string, employeeId: string, dto: CreateFineDto) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.fine.create({
      data: {
        businessId: b.id,
        employeeId,
        amount: toDecimal(dto.amount),
        reason: dto.reason,
        isApplied: false,
      },
    });
  }

  async getFines(userId: string, employeeId: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.fine.findMany({ where: { employeeId }, orderBy: { date: 'desc' } });
  }

  async getShifts(userId: string, employeeId: string) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');
    return this.prisma.shift.findMany({ where: { employeeId }, orderBy: { startTime: 'desc' }, take: 100 });
  }

  async createShift(userId: string, employeeId: string, dto: CreateShiftDto) {
    const b = await this.getBusiness(userId);
    const e = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!e) throw new NotFoundException('Employee not found');

    let hoursWorked = dto.hoursWorked;
    if (!hoursWorked && dto.endTime) {
      const diff = new Date(dto.endTime).getTime() - new Date(dto.startTime).getTime();
      hoursWorked = diff / 3600000;
    }

    return this.prisma.shift.create({
      data: {
        employeeId,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        hoursWorked: hoursWorked ? toDecimal(hoursWorked) : null,
        notes: dto.notes,
      },
    });
  }

  async getPayrollForMonth(userId: string, employeeId: string, month: string) {
    const b = await this.getBusiness(userId);
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!employee) throw new NotFoundException('Employee not found');

    const { year, month: m } = parseMonth(month);
    const start = startOfMonth(year, m);
    const end = endOfMonth(year, m);

    const monthSales = await this.prisma.sale.aggregate({
      where: { businessId: b.id, date: { gte: start, lte: end }, status: 'COMPLETED' },
      _sum: { total: true },
    });

    const totalSales = toDecimal(monthSales._sum.total || 0);
    const baseSalary = toDecimal(employee.salary);
    const bonus = totalSales.times(toDecimal(employee.bonusPercent)).dividedBy(100);

    const finesAgg = await this.prisma.fine.aggregate({
      where: { employeeId, isApplied: false },
      _sum: { amount: true },
    });
    const fines = toDecimal(finesAgg._sum.amount || 0);

    const advancesAgg = await this.prisma.employeePayment.aggregate({
      where: { employeeId, paymentType: 'ADVANCE', period: month },
      _sum: { amount: true },
    });
    const advances = toDecimal(advancesAgg._sum.amount || 0);

    const finalSalary = baseSalary.plus(bonus).minus(fines).minus(advances);

    return {
      employeeId,
      name: employee.name,
      month,
      baseSalary: baseSalary.toFixed(2),
      monthSales: totalSales.toFixed(2),
      bonus: bonus.toFixed(2),
      fines: fines.toFixed(2),
      advances: advances.toFixed(2),
      finalSalary: finalSalary.toFixed(2),
    };
  }

  async calculateMonthlyPayroll(userId: string, dto: CalcPayrollDto) {
    const b = await this.getBusiness(userId);
    const employees = await this.prisma.employee.findMany({ where: { businessId: b.id, isActive: true } });
    const { year, month: m } = parseMonth(dto.month);
    const start = startOfMonth(year, m);
    const end = endOfMonth(year, m);

    const monthSales = await this.prisma.sale.aggregate({
      where: { businessId: b.id, date: { gte: start, lte: end }, status: 'COMPLETED' },
      _sum: { total: true },
    });
    const totalSales = toDecimal(monthSales._sum.total || 0);

    const results = [];

    for (const employee of employees) {
      const baseSalary = toDecimal(employee.salary);
      const bonus = totalSales.times(toDecimal(employee.bonusPercent)).dividedBy(100);

      const finesAgg = await this.prisma.fine.aggregate({
        where: { employeeId: employee.id, isApplied: false },
        _sum: { amount: true },
      });
      const fines = toDecimal(finesAgg._sum.amount || 0);

      const advancesAgg = await this.prisma.employeePayment.aggregate({
        where: { employeeId: employee.id, paymentType: 'ADVANCE', period: dto.month },
        _sum: { amount: true },
      });
      const advances = toDecimal(advancesAgg._sum.amount || 0);

      const finalSalary = baseSalary.plus(bonus).minus(fines).minus(advances);

      if (dto.applyImmediately && finalSalary.greaterThan(0)) {
        await this.prisma.$transaction(async (tx) => {
          const expense = await tx.expense.create({
            data: {
              businessId: b.id,
              expenseType: 'PAYROLL',
              amount: finalSalary,
              description: `Monthly salary — ${employee.name} (${dto.month})`,
              employeeId: employee.id,
              paymentMethod: 'CASH',
              isPaid: true,
              date: new Date(),
            },
          });
          await tx.employeePayment.create({
            data: {
              employeeId: employee.id,
              expenseId: expense.id,
              amount: finalSalary,
              paymentType: 'SALARY',
              period: dto.month,
              notes: `Auto-calculated ${dto.month}`,
            },
          });
          if (fines.greaterThan(0)) {
            await tx.fine.updateMany({
              where: { employeeId: employee.id, isApplied: false },
              data: { isApplied: true, appliedAt: new Date() },
            });
          }
        });
      }

      results.push({
        employeeId: employee.id,
        name: employee.name,
        baseSalary: baseSalary.toFixed(2),
        bonus: bonus.toFixed(2),
        fines: fines.toFixed(2),
        advances: advances.toFixed(2),
        finalSalary: finalSalary.toFixed(2),
        applied: dto.applyImmediately && finalSalary.greaterThan(0),
      });
    }

    return { month: dto.month, totalSales: totalSales.toFixed(2), employees: results };
  }
}
