import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { StockInDto } from './dto/stock-in.dto';
import { WasteDto } from './dto/waste.dto';
import { CleaningDto } from './dto/cleaning.dto';
import { AdjustDto } from './dto/adjust.dto';
import Decimal from 'decimal.js';
import { toDecimal, multiplyDecimal, calcWeightedAvgCost } from '../../common/utils/decimal.util';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  public async checkAndNotifyLowStock(businessId: string, itemId: string, stockAfter: Decimal) {
    try {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) return;
      if (
        stockAfter.lessThanOrEqualTo(toDecimal(item.minStockLevel)) &&
        toDecimal(item.minStockLevel).greaterThan(0)
      ) {
        await this.telegramService.notifyLowStock({
          businessId,
          items: [
            {
              name: item.name,
              currentStock: stockAfter.toFixed(2),
              minStockLevel: item.minStockLevel.toString(),
              unit: item.unit,
            },
          ],
        });
      }
    } catch {
      // Non-critical: don't fail the main operation
    }
  }

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  private async getItem(businessId: string, itemId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: itemId, businessId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async findAll(userId: string, category?: string, page = 1, limit = 100) {
    const b = await this.getBusiness(userId);
    const where = { businessId: b.id, isActive: true, ...(category && { category }) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, id);
    return item;
  }

  async create(userId: string, dto: CreateItemDto) {
    const b = await this.getBusiness(userId);
    try {
      return await this.prisma.inventoryItem.create({
        data: {
          businessId: b.id,
          name: dto.name,
          nameRu: dto.nameRu,
          nameTg: dto.nameTg,
          unit: dto.unit,
          minStockLevel: toDecimal(dto.minStockLevel || 0),
          category: dto.category,
          cleaningLossPct: toDecimal(dto.cleaningLossPct || 0),
        },
      });
    } catch {
      throw new ConflictException('Item with this name already exists');
    }
  }

  async update(userId: string, id: string, dto: Partial<CreateItemDto>) {
    const b = await this.getBusiness(userId);
    await this.getItem(b.id, id);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.nameRu !== undefined && { nameRu: dto.nameRu }),
        ...(dto.nameTg !== undefined && { nameTg: dto.nameTg }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.minStockLevel !== undefined && { minStockLevel: toDecimal(dto.minStockLevel) }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.cleaningLossPct !== undefined && {
          cleaningLossPct: toDecimal(dto.cleaningLossPct),
        }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    await this.getItem(b.id, id);
    return this.prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  }

  async stockIn(userId: string, itemId: string, dto: StockInDto) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, itemId);

    const qty = toDecimal(dto.quantity);
    const unitCost = toDecimal(dto.unitCost);
    const totalCost = multiplyDecimal(qty, unitCost);
    const stockBefore = toDecimal(item.currentStock);
    const newAvgCost = calcWeightedAvgCost(stockBefore, item.avgCost, qty, unitCost);
    const stockAfter = stockBefore.plus(qty);

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: stockAfter, avgCost: newAvgCost },
      });
      return tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'IN',
          quantity: qty,
          unitCost,
          totalCost,
          stockBefore,
          stockAfter,
          reason: 'MANUAL',
          notes: dto.notes,
        },
      });
    });
  }

  async stockOut(userId: string, itemId: string, dto: { quantity: number; notes?: string }) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, itemId);
    const qty = toDecimal(dto.quantity);
    if (toDecimal(item.currentStock).lessThan(qty)) {
      throw new ConflictException(
        `Insufficient stock for ${item.name}. Available: ${item.currentStock}`,
      );
    }
    const stockBefore = toDecimal(item.currentStock);
    const stockAfter = stockBefore.minus(qty);
    const totalCost = multiplyDecimal(qty, item.avgCost);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: stockAfter } });
      return tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'OUT',
          quantity: qty,
          unitCost: toDecimal(item.avgCost),
          totalCost,
          stockBefore,
          stockAfter,
          reason: 'MANUAL',
          notes: dto.notes,
        },
      });
    });
    await this.checkAndNotifyLowStock(b.id, itemId, stockAfter);
    return result;
  }

  async adjust(userId: string, itemId: string, dto: AdjustDto) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, itemId);
    const newQty = toDecimal(dto.newQuantity);
    const stockBefore = toDecimal(item.currentStock);
    const diff = newQty.minus(stockBefore);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: newQty } });
      return tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'ADJUSTMENT',
          quantity: diff.abs(),
          unitCost: toDecimal(item.avgCost),
          totalCost: diff.abs().times(toDecimal(item.avgCost)),
          stockBefore,
          stockAfter: newQty,
          reason: dto.reason || 'ADJUSTMENT',
          notes: dto.notes,
        },
      });
    });
    await this.checkAndNotifyLowStock(b.id, itemId, newQty);
    return result;
  }

  async waste(userId: string, itemId: string, dto: WasteDto) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, itemId);
    const qty = toDecimal(dto.quantity);
    if (toDecimal(item.currentStock).lessThan(qty)) {
      throw new ConflictException(`Insufficient stock for ${item.name}`);
    }
    const stockBefore = toDecimal(item.currentStock);
    const stockAfter = stockBefore.minus(qty);
    const totalCost = multiplyDecimal(qty, item.avgCost);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: stockAfter } });
      const invTx = await tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'WASTE',
          quantity: qty,
          unitCost: toDecimal(item.avgCost),
          totalCost,
          stockBefore,
          stockAfter,
          reason: dto.reason,
          notes: dto.notes,
        },
      });
      await tx.expense.create({
        data: {
          businessId: b.id,
          expenseType: 'WASTE',
          amount: totalCost,
          description: `Списание: ${item.name} - ${dto.reason}`,
          date: new Date(),
        },
      });
      return invTx;
    });
    await this.checkAndNotifyLowStock(b.id, itemId, stockAfter);
    return result;
  }

  async cleaning(userId: string, itemId: string, dto: CleaningDto) {
    const b = await this.getBusiness(userId);
    const item = await this.getItem(b.id, itemId);

    const rawQty = toDecimal(dto.rawQuantity);
    if (toDecimal(item.currentStock).lessThan(rawQty)) {
      throw new ConflictException(
        `Insufficient stock for cleaning. Available: ${item.currentStock}`,
      );
    }

    const lossPct = toDecimal(item.cleaningLossPct);
    let cleanedQty: Decimal;
    if (dto.actualCleanedQuantity != null) {
      cleanedQty = toDecimal(dto.actualCleanedQuantity);
    } else {
      cleanedQty = rawQty.times(new Decimal(1).minus(lossPct.dividedBy(100)));
    }
    const lossQty = rawQty.minus(cleanedQty);
    const actualLossPct = rawQty.isZero() ? new Decimal(0) : lossQty.dividedBy(rawQty).times(100);

    const stockBefore = toDecimal(item.currentStock);
    const stockAfterRawOut = stockBefore.minus(rawQty);
    const stockAfterCleanIn = stockAfterRawOut.plus(cleanedQty);
    const unitCost = toDecimal(item.avgCost);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: stockAfterCleanIn },
      });

      const outTx = await tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'OUT',
          quantity: rawQty,
          unitCost,
          totalCost: multiplyDecimal(rawQty, unitCost),
          stockBefore,
          stockAfter: stockAfterRawOut,
          reason: 'CLEANING_RAW',
          notes: dto.notes,
        },
      });

      const inTx = await tx.inventoryTransaction.create({
        data: {
          businessId: b.id,
          inventoryItemId: itemId,
          type: 'IN',
          quantity: cleanedQty,
          unitCost,
          totalCost: multiplyDecimal(cleanedQty, unitCost),
          stockBefore: stockAfterRawOut,
          stockAfter: stockAfterCleanIn,
          reason: 'CLEANING_CLEANED',
          notes: dto.notes,
        },
      });

      return {
        raw: rawQty.toFixed(4),
        cleaned: cleanedQty.toFixed(4),
        loss: lossQty.toFixed(4),
        lossPct: actualLossPct.toFixed(2),
        stockBefore: stockBefore.toFixed(4),
        stockAfter: stockAfterCleanIn.toFixed(4),
        outTransactionId: outTx.id,
        inTransactionId: inTx.id,
      };
    });
    await this.checkAndNotifyLowStock(b.id, itemId, stockAfterCleanIn);
    return result;
  }

  async getHistory(userId: string, itemId: string, page = 1, limit = 50) {
    const b = await this.getBusiness(userId);
    await this.getItem(b.id, itemId);
    const where = { inventoryItemId: itemId, businessId: b.id };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLowStock(userId: string) {
    const b = await this.getBusiness(userId);
    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId: b.id, isActive: true },
    });
    return items.filter((item) =>
      toDecimal(item.currentStock).lessThanOrEqualTo(toDecimal(item.minStockLevel)),
    );
  }

  async getValuation(userId: string) {
    const b = await this.getBusiness(userId);
    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId: b.id, isActive: true },
    });
    let total = new Decimal(0);
    const details = items.map((item) => {
      const value = multiplyDecimal(item.currentStock, item.avgCost);
      total = total.plus(value);
      return {
        id: item.id,
        name: item.name,
        stock: item.currentStock,
        avgCost: item.avgCost,
        value: value.toFixed(2),
      };
    });
    return { totalValue: total.toFixed(2), items: details };
  }
}
