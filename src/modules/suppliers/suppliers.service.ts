import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchasesDto } from './dto/filter-purchases.dto';
import Decimal from 'decimal.js';
import { toDecimal, multiplyDecimal, calcWeightedAvgCost } from '../../common/utils/decimal.util';
import { startOfDay, endOfDay } from '../../common/utils/date.util';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string, page = 1, limit = 50) {
    const b = await this.getBusiness(userId);
    const where = { businessId: b.id, isActive: true };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const s = await this.prisma.supplier.findFirst({ where: { id, businessId: b.id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async create(userId: string, dto: CreateSupplierDto) {
    const b = await this.getBusiness(userId);
    try {
      return await this.prisma.supplier.create({
        data: {
          businessId: b.id,
          name: dto.name,
          type: dto.type || 'OTHER',
          phone: dto.phone,
          notes: dto.notes,
        },
      });
    } catch {
      throw new ConflictException('Supplier with this name already exists');
    }
  }

  async update(userId: string, id: string, dto: Partial<CreateSupplierDto>) {
    const b = await this.getBusiness(userId);
    const s = await this.prisma.supplier.findFirst({ where: { id, businessId: b.id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const s = await this.prisma.supplier.findFirst({ where: { id, businessId: b.id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }

  async createPurchase(userId: string, supplierId: string, dto: CreatePurchaseDto) {
    const b = await this.getBusiness(userId);
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId: b.id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    let quantity: Decimal;
    if (dto.boxCount && dto.kgPerBox) {
      quantity = multiplyDecimal(dto.boxCount, dto.kgPerBox);
    } else if (dto.quantity != null) {
      quantity = toDecimal(dto.quantity);
    } else {
      throw new BadRequestException('Provide either (boxCount + kgPerBox) or quantity');
    }

    const pricePerUnit = toDecimal(dto.pricePerUnit);
    const totalAmount = multiplyDecimal(quantity, pricePerUnit);

    return this.prisma.$transaction(async (tx) => {
      let forecastCupsBy03: number | null = null;
      let forecastCupsBy04: number | null = null;

      let inventoryTxId: string | undefined;

      if (dto.inventoryItemId) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: dto.inventoryItemId, businessId: b.id },
        });
        if (!item) throw new NotFoundException('Inventory item not found');

        const stockBefore = toDecimal(item.currentStock);
        const newAvgCost = calcWeightedAvgCost(stockBefore, item.avgCost, quantity, pricePerUnit);
        const stockAfter = stockBefore.plus(quantity);

        const invTx = await tx.inventoryTransaction.create({
          data: {
            businessId: b.id,
            inventoryItemId: dto.inventoryItemId,
            type: 'IN',
            quantity,
            unitCost: pricePerUnit,
            totalCost: totalAmount,
            stockBefore,
            stockAfter,
            reason: 'PURCHASE',
            notes: dto.notes,
            date: new Date(),
          },
        });

        await tx.inventoryItem.update({
          where: { id: dto.inventoryItemId },
          data: { currentStock: stockAfter, avgCost: newAvgCost },
        });

        inventoryTxId = invTx.id;

        // Save price history
        const today = new Date();
        await tx.supplierPriceHistory.upsert({
          where: {
            supplierId_inventoryItemId_date: {
              supplierId,
              inventoryItemId: dto.inventoryItemId,
              date: new Date(today.toISOString().split('T')[0]),
            },
          },
          create: {
            supplierId,
            inventoryItemId: dto.inventoryItemId,
            date: new Date(today.toISOString().split('T')[0]),
            pricePerUnit,
          },
          update: { pricePerUnit },
        });

        // Forecast cups
        const recipes = await tx.productRecipe.findMany({
          where: { inventoryItemId: dto.inventoryItemId },
          include: { product: true },
        });

        for (const r of recipes) {
          if (!r.product.isActive) continue;
          const perCup = toDecimal(r.quantity);
          if (perCup.isZero()) continue;
          const cups = Math.floor(quantity.dividedBy(perCup).toNumber());
          if (r.product.cupType === 'CUP_300_ML') {
            forecastCupsBy03 = (forecastCupsBy03 || 0) + cups;
          } else if (r.product.cupType === 'CUP_400_ML') {
            forecastCupsBy04 = (forecastCupsBy04 || 0) + cups;
          }
        }
      }

      const purchase = await tx.supplierPurchase.create({
        data: {
          businessId: b.id,
          supplierId,
          inventoryItemId: dto.inventoryItemId || null,
          quantity,
          unit: dto.unit,
          pricePerUnit,
          totalAmount,
          boxCount: dto.boxCount || null,
          kgPerBox: dto.kgPerBox ? toDecimal(dto.kgPerBox) : null,
          forecastCupsBy03,
          forecastCupsBy04,
          notes: dto.notes,
          inventoryTxId: inventoryTxId || null,
        },
        include: { supplier: true, inventoryItem: true },
      });

      // Expense
      await tx.expense.create({
        data: {
          businessId: b.id,
          expenseType: 'COGS',
          amount: totalAmount,
          description: `Покупка у ${supplier.name}: ${quantity.toFixed(2)} ${dto.unit}`,
          vendor: supplier.name,
          paymentMethod: 'CASH',
          isPaid: true,
          date: new Date(),
        },
      });

      // Financial transaction
      await tx.financialTransaction.create({
        data: {
          businessId: b.id,
          type: 'EXPENSE',
          amount: totalAmount,
          description: `Supplier purchase: ${supplier.name}`,
          referenceId: purchase.id,
          refType: 'SUPPLIER_PURCHASE',
        },
      });

      // Update cashbox
      const cashbox = await tx.cashbox.findUnique({ where: { businessId: b.id } });
      if (cashbox) {
        await tx.cashbox.update({
          where: { businessId: b.id },
          data: {
            balance: toDecimal(cashbox.balance).minus(totalAmount),
            lastUpdated: new Date(),
          },
        });
        await tx.cashboxOperation.create({
          data: {
            cashboxId: cashbox.id,
            type: 'OUT',
            amount: totalAmount,
            balanceBefore: toDecimal(cashbox.balance),
            balanceAfter: toDecimal(cashbox.balance).minus(totalAmount),
            description: `Покупка у ${supplier.name}`,
            referenceId: purchase.id,
          },
        });
      }

      return {
        purchase,
        forecast: {
          quantity: quantity.toFixed(4),
          totalAmount: totalAmount.toFixed(2),
          forecastCupsBy03,
          forecastCupsBy04,
        },
      };
    });
  }

  async getPurchases(userId: string, supplierId: string, filter: FilterPurchasesDto) {
    const b = await this.getBusiness(userId);
    const where: any = { supplierId, businessId: b.id };
    if (filter.from || filter.to) {
      where.date = {};
      if (filter.from) where.date.gte = startOfDay(filter.from);
      if (filter.to) where.date.lte = endOfDay(filter.to);
    }
    return this.prisma.supplierPurchase.findMany({
      where,
      include: { inventoryItem: true, supplier: true },
      orderBy: { date: 'desc' },
    });
  }

  async getPriceHistory(
    userId: string,
    supplierId: string,
    itemId?: string,
    from?: string,
    to?: string,
  ) {
    const b = await this.getBusiness(userId);
    const where: any = { supplierId };
    if (itemId) where.inventoryItemId = itemId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return this.prisma.supplierPriceHistory.findMany({
      where,
      include: { inventoryItem: true },
      orderBy: { date: 'desc' },
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

    const purchases = await this.prisma.supplierPurchase.groupBy({
      by: ['supplierId'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    });

    const suppliers = await this.prisma.supplier.findMany({ where: { businessId: b.id } });
    const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

    return purchases.map((p) => ({
      supplier: supplierMap[p.supplierId],
      totalAmount: p._sum.totalAmount,
      count: p._count,
    }));
  }
}
