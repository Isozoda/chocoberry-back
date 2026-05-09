import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FilterSalesDto } from './dto/filter-sales.dto';
import Decimal from 'decimal.js';
import { toDecimal, multiplyDecimal, addDecimal } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay } from '../../common/utils/date.util';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string, filter: FilterSalesDto) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id };
    if (filter.from || filter.to) {
      where.date = {};
      if (filter.from) where.date.gte = startOfDay(filter.from);
      if (filter.to) where.date.lte = endOfDay(filter.to);
    }
    if (filter.status) where.status = filter.status;
    if (filter.payment) where.paymentMethod = filter.payment;

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId: b.id },
      include: { items: { include: { product: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(userId: string, dto: CreateSaleDto) {
    const b = await this.getBusiness(userId);

    const paymentMethod = dto.paymentMethod || 'CASH';
    const discount = toDecimal(dto.discount || 0);
    const tax = toDecimal(dto.tax || 0);

    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Decimal(0);
      let totalCost = new Decimal(0);

      const resolvedItems: Array<{
        productId?: string;
        name: string;
        quantity: Decimal;
        unitPrice: Decimal;
        cost: Decimal;
        total: Decimal;
        recipe: Array<{ inventoryItemId: string; qty: Decimal; itemName: string }>;
      }> = [];

      // 1. Resolve each item and check stock
      for (const item of dto.items) {
        let name = item.name || 'Custom Item';
        let unitPrice: Decimal;
        let cost = new Decimal(0);
        const qty = toDecimal(item.quantity);
        const recipe: Array<{ inventoryItemId: string; qty: Decimal; itemName: string }> = [];

        if (item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, businessId: b.id },
            include: { recipe: { include: { inventoryItem: true } } },
          });
          if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
          if (!product.isActive)
            throw new BadRequestException(`Product ${product.name} is not active`);

          name = product.name;
          unitPrice = item.unitPrice != null ? toDecimal(item.unitPrice) : toDecimal(product.price);

          // Check & deduct recipe ingredients
          for (const r of product.recipe) {
            const needed = multiplyDecimal(r.quantity, qty);
            const invItem = await tx.inventoryItem.findUnique({ where: { id: r.inventoryItemId } });
            if (!invItem)
              throw new NotFoundException(`Inventory item ${r.inventoryItemId} not found`);
            if (toDecimal(invItem.currentStock).lessThan(needed)) {
              throw new ConflictException(
                `Не хватает: ${invItem.name}. Нужно: ${needed.toFixed(4)}, есть: ${invItem.currentStock}`,
              );
            }
            cost = cost.plus(multiplyDecimal(needed, invItem.avgCost));
            recipe.push({
              inventoryItemId: r.inventoryItemId,
              qty: needed,
              itemName: invItem.name,
            });
          }
        } else {
          if (!item.name)
            throw new BadRequestException('name required when productId is not provided');
          unitPrice = item.unitPrice != null ? toDecimal(item.unitPrice) : new Decimal(0);
        }

        const lineTotal = multiplyDecimal(unitPrice, qty);
        subtotal = subtotal.plus(lineTotal);
        totalCost = totalCost.plus(cost);

        resolvedItems.push({
          productId: item.productId,
          name,
          quantity: qty,
          unitPrice,
          cost,
          total: lineTotal,
          recipe,
        });
      }

      const total = subtotal.minus(discount).plus(tax);
      if (total.lessThan(0)) throw new BadRequestException('Total cannot be negative');

      // Validate MIXED payment
      let cashAmount = toDecimal(dto.cashAmount || 0);
      let cardAmount = toDecimal(dto.cardAmount || 0);

      if (paymentMethod === 'MIXED') {
        if (!addDecimal(cashAmount, cardAmount).equals(total)) {
          throw new BadRequestException(
            `MIXED: cashAmount(${cashAmount}) + cardAmount(${cardAmount}) must equal total(${total})`,
          );
        }
      } else if (paymentMethod === 'CASH') {
        cashAmount = total;
        cardAmount = new Decimal(0);
      } else if (paymentMethod === 'CARD') {
        cardAmount = total;
        cashAmount = new Decimal(0);
      }

      const saleNumber = `CB-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

      const sale = await tx.sale.create({
        data: {
          businessId: b.id,
          saleNumber,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          cashAmount,
          cardAmount,
          status: 'COMPLETED',
          employeeId: dto.employeeId || null,
          notes: dto.notes,
          date: new Date(),
          items: {
            create: resolvedItems.map((ri) => ({
              productId: ri.productId || null,
              name: ri.name,
              quantity: ri.quantity,
              unitPrice: ri.unitPrice,
              cost: ri.cost,
              total: ri.total,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // 2. Deduct inventory for each item's recipe
      for (const ri of resolvedItems) {
        for (const r of ri.recipe) {
          const invItem = await tx.inventoryItem.findUnique({ where: { id: r.inventoryItemId } });
          const stockBefore = toDecimal(invItem.currentStock);
          const stockAfter = stockBefore.minus(r.qty);
          await tx.inventoryItem.update({
            where: { id: r.inventoryItemId },
            data: { currentStock: stockAfter },
          });
          await tx.inventoryTransaction.create({
            data: {
              businessId: b.id,
              inventoryItemId: r.inventoryItemId,
              type: 'OUT',
              quantity: r.qty,
              unitCost: toDecimal(invItem.avgCost),
              totalCost: multiplyDecimal(r.qty, invItem.avgCost),
              stockBefore,
              stockAfter,
              reason: 'SALE',
              saleId: sale.id,
            },
          });
          // Notify low stock if needed
          await this.inventoryService.checkAndNotifyLowStock(b.id, r.inventoryItemId, stockAfter);
        }
      }

      // 3. Financial transaction
      await tx.financialTransaction.create({
        data: {
          businessId: b.id,
          type: 'INCOME',
          amount: total,
          description: `Sale ${saleNumber}`,
          referenceId: sale.id,
          refType: 'SALE',
        },
      });

      // 4. Update cashbox
      const cashbox = await tx.cashbox.findUnique({ where: { businessId: b.id } });
      if (cashbox) {
        const newBalance = toDecimal(cashbox.balance).plus(cashAmount);
        const newCardBalance = toDecimal(cashbox.cardBalance).plus(cardAmount);
        await tx.cashbox.update({
          where: { businessId: b.id },
          data: { balance: newBalance, cardBalance: newCardBalance, lastUpdated: new Date() },
        });
        await tx.cashboxOperation.create({
          data: {
            cashboxId: cashbox.id,
            type: 'IN',
            amount: total,
            balanceBefore: toDecimal(cashbox.balance),
            balanceAfter: newBalance,
            description: `Sale ${saleNumber}`,
            referenceId: sale.id,
          },
        });
      }

      return sale;
    });
  }

  async voidSale(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const sale = await this.prisma.sale.findFirst({ where: { id, businessId: b.id } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOID') throw new ConflictException('Sale already voided');
    return this.prisma.sale.update({ where: { id }, data: { status: 'VOID' } });
  }

  async getStatsToday(userId: string) {
    const b = await this.getBusiness(userId);
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    // Yesterday range for comparison
    const yesterdayStart = new Date(start.getTime() - 86400000);
    const yesterdayEnd = new Date(end.getTime() - 86400000);

    const [stats, yesterdayStats] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: b.id, date: { gte: start, lte: end }, status: 'COMPLETED' },
        _sum: { total: true, cashAmount: true, cardAmount: true, discount: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          businessId: b.id,
          date: { gte: yesterdayStart, lte: yesterdayEnd },
          status: 'COMPLETED',
        },
        _sum: { total: true },
      }),
    ]);

    const totalToday = toDecimal(stats._sum.total || 0);
    const totalYesterday = toDecimal(yesterdayStats._sum.total || 0);
    let vsYesterday = 0;
    if (totalYesterday.greaterThan(0)) {
      vsYesterday = totalToday
        .minus(totalYesterday)
        .dividedBy(totalYesterday)
        .times(100)
        .toDecimalPlaces(1)
        .toNumber();
    } else if (totalToday.greaterThan(0)) {
      vsYesterday = 100;
    }

    return {
      totalSales: totalToday.toFixed(2),
      saleCount: stats._count,
      cashSales: toDecimal(stats._sum.cashAmount || 0).toFixed(2),
      cardSales: toDecimal(stats._sum.cardAmount || 0).toFixed(2),
      totalDiscount: toDecimal(stats._sum.discount || 0).toFixed(2),
      vsYesterday,
    };
  }

  async getTopProducts(userId: string, from?: string, to?: string, limit = 10) {
    const b = await this.getBusiness(userId);
    const where: any = { sale: { businessId: b.id, status: 'COMPLETED' } };
    if (from || to) {
      where.sale.date = {};
      if (from) where.sale.date.gte = startOfDay(from);
      if (to) where.sale.date.lte = endOfDay(to);
    }

    const items = await this.prisma.saleItem.groupBy({
      by: ['productId', 'name'],
      where,
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    return items.map((item) => ({
      productId: item.productId,
      name: item.name,
      qty: toDecimal(item._sum.quantity || 0).toNumber(),
      revenue: toDecimal(item._sum.total || 0).toFixed(2),
      count: item._count,
    }));
  }

  async getHotHours(userId: string, from?: string, to?: string) {
    const b = await this.getBusiness(userId);
    const where: any = { businessId: b.id, status: 'COMPLETED' };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = startOfDay(from);
      if (to) where.date.lte = endOfDay(to);
    }

    const sales = await this.prisma.sale.findMany({ where, select: { date: true, total: true } });
    const hourMap: Record<number, { count: number; revenue: Decimal }> = {};

    for (let h = 0; h < 24; h++) {
      hourMap[h] = { count: 0, revenue: new Decimal(0) };
    }
    for (const s of sales) {
      const hour = new Date(s.date).getHours();
      hourMap[hour].count += 1;
      hourMap[hour].revenue = hourMap[hour].revenue.plus(toDecimal(s.total));
    }

    return Object.entries(hourMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      count: data.count,
      revenue: data.revenue.toFixed(2),
    }));
  }
}
