import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { toDecimal, divideDecimal } from '../../common/utils/decimal.util';
import { parseMonth } from '../../common/utils/date.util';
import Decimal from 'decimal.js';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  private getWorkingDaysInMonth(year: number, month: number): number {
    const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`).day();
      if (dow !== 0) count++;
    }
    return count;
  }

  async getDaily(userId: string, date: string) {
    const b = await this.getBusiness(userId);
    const parsedDate = dayjs(date).startOf('day').toDate();

    const employees = await this.prisma.employee.findMany({
      where: { businessId: b.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { businessId: b.id, date: parsedDate },
    });

    const result = employees.map((emp) => {
      const record = records.find((r) => r.employeeId === emp.id) ?? null;
      return {
        employee: {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          salary: emp.salary.toString(),
          salaryType: emp.salaryType,
        },
        record: record
          ? {
              id: record.id,
              status: record.status,
              note: record.note,
              bonus: record.bonus.toString(),
              penalty: record.penalty.toString(),
              overtimePay: record.overtimePay.toString(),
            }
          : null,
      };
    });

    const present = result.filter((r) => r.record?.status === 'PRESENT' || r.record?.status === 'LATE').length;
    const absent = result.filter((r) => r.record?.status === 'ABSENT').length;

    return { date, employees: result, present, absent, total: employees.length };
  }

  async getWeekly(userId: string, weekStart: string) {
    const b = await this.getBusiness(userId);
    const start = dayjs(weekStart).startOf('day').toDate();
    const end = dayjs(weekStart).add(6, 'day').endOf('day').toDate();

    const days = Array.from({ length: 7 }, (_, i) =>
      dayjs(weekStart).add(i, 'day').format('YYYY-MM-DD'),
    );

    const employees = await this.prisma.employee.findMany({
      where: { businessId: b.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { businessId: b.id, date: { gte: start, lte: end } },
    });

    const { year, month } = parseMonth(dayjs(weekStart).format('YYYY-MM'));
    const workingDaysInMonth = this.getWorkingDaysInMonth(year, month);

    const result = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const dayMap: Record<string, any> = {};

      for (const day of days) {
        const rec = empRecords.find((r) => dayjs(r.date).format('YYYY-MM-DD') === day);
        dayMap[day] = rec
          ? {
              id: rec.id,
              status: rec.status,
              bonus: rec.bonus.toString(),
              penalty: rec.penalty.toString(),
              note: rec.note,
            }
          : null;
      }

      const monthlySalary = toDecimal(emp.salary);
      const dailyRate = workingDaysInMonth > 0
        ? monthlySalary.dividedBy(workingDaysInMonth)
        : new Decimal(0);

      const workedDays = Object.values(dayMap).filter(
        (d) => d && ['PRESENT', 'LATE', 'DAY_OFF', 'SICK'].includes(d.status),
      ).length;
      const halfDays = Object.values(dayMap).filter((d) => d?.status === 'HALF_DAY').length;
      const effectiveWorked = workedDays + halfDays * 0.5;
      const weeklySalary = dailyRate.times(effectiveWorked);

      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        monthlySalary: monthlySalary.toFixed(2),
        days: dayMap,
        workedDays: effectiveWorked,
        weeklySalary: weeklySalary.toFixed(2),
      };
    });

    return {
      weekStart,
      weekEnd: dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD'),
      days,
      employees: result,
    };
  }

  async getMonthlySummary(userId: string, month: string) {
    const b = await this.getBusiness(userId);
    const { year, month: m } = parseMonth(month);
    const start = dayjs(`${year}-${String(m).padStart(2, '0')}-01`).startOf('month').toDate();
    const end = dayjs(`${year}-${String(m).padStart(2, '0')}-01`).endOf('month').toDate();

    const workingDaysInMonth = this.getWorkingDaysInMonth(year, m);

    const employees = await this.prisma.employee.findMany({
      where: { businessId: b.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { businessId: b.id, date: { gte: start, lte: end } },
    });

    let totalPayroll = new Decimal(0);
    let totalBonuses = new Decimal(0);
    let totalPenalties = new Decimal(0);

    const result = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const monthlySalary = toDecimal(emp.salary);
      const dailyRate = workingDaysInMonth > 0
        ? monthlySalary.dividedBy(workingDaysInMonth)
        : new Decimal(0);

      const workedDays = empRecords.filter((r) =>
        ['PRESENT', 'LATE', 'DAY_OFF', 'SICK'].includes(r.status),
      ).length;
      const absentDays = empRecords.filter((r) => r.status === 'ABSENT').length;
      const halfDays = empRecords.filter((r) => r.status === 'HALF_DAY').length;
      const lateDays = empRecords.filter((r) => r.status === 'LATE').length;
      const sickDays = empRecords.filter((r) => r.status === 'SICK').length;
      const dayOffDays = empRecords.filter((r) => r.status === 'DAY_OFF').length;

      const totalBonus = empRecords.reduce(
        (acc, r) => acc.plus(toDecimal(r.bonus)),
        new Decimal(0),
      );
      const totalPenalty = empRecords.reduce(
        (acc, r) => acc.plus(toDecimal(r.penalty)),
        new Decimal(0),
      );
      const totalOvertimePay = empRecords.reduce(
        (acc, r) => acc.plus(toDecimal(r.overtimePay)),
        new Decimal(0),
      );

      const absentDeduction = dailyRate.times(absentDays);
      const halfDayDeduction = dailyRate.times(halfDays).times(0.5);
      const finalSalary = monthlySalary
        .minus(absentDeduction)
        .minus(halfDayDeduction)
        .minus(totalPenalty)
        .plus(totalBonus)
        .plus(totalOvertimePay);

      const clampedFinal = finalSalary.lessThan(0) ? new Decimal(0) : finalSalary;

      totalPayroll = totalPayroll.plus(clampedFinal);
      totalBonuses = totalBonuses.plus(totalBonus);
      totalPenalties = totalPenalties.plus(totalPenalty);

      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        monthlySalary: monthlySalary.toFixed(2),
        dailyRate: dailyRate.toFixed(2),
        workedDays,
        absentDays,
        halfDays,
        lateDays,
        sickDays,
        dayOffDays,
        totalBonus: totalBonus.toFixed(2),
        totalPenalty: totalPenalty.toFixed(2),
        totalOvertimePay: totalOvertimePay.toFixed(2),
        finalSalary: clampedFinal.toFixed(2),
      };
    });

    return {
      month,
      workingDaysInMonth,
      totalPayroll: totalPayroll.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalPenalties: totalPenalties.toFixed(2),
      employees: result,
    };
  }

  async upsertRecord(userId: string, employeeId: string, dto: UpsertAttendanceDto) {
    const b = await this.getBusiness(userId);
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!emp) throw new NotFoundException('Employee not found');

    const dateObj = dayjs(dto.date).startOf('day').toDate();

    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: dateObj } },
      update: {
        status: dto.status as any,
        note: dto.note ?? null,
        bonus: toDecimal(dto.bonus ?? 0),
        penalty: toDecimal(dto.penalty ?? 0),
        overtimePay: toDecimal(dto.overtimePay ?? 0),
      },
      create: {
        businessId: b.id,
        employeeId,
        date: dateObj,
        status: dto.status as any,
        note: dto.note ?? null,
        bonus: toDecimal(dto.bonus ?? 0),
        penalty: toDecimal(dto.penalty ?? 0),
        overtimePay: toDecimal(dto.overtimePay ?? 0),
      },
    });
  }

  async deleteRecord(userId: string, employeeId: string, date: string) {
    const b = await this.getBusiness(userId);
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId: b.id } });
    if (!emp) throw new NotFoundException('Employee not found');

    const dateObj = dayjs(date).startOf('day').toDate();
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: dateObj } },
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    return this.prisma.attendance.delete({ where: { id: record.id } });
  }
}
