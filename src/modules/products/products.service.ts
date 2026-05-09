import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetRecipeDto } from './dto/set-recipe.dto';
import Decimal from 'decimal.js';
import { toDecimal, multiplyDecimal } from '../../common/utils/decimal.util';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async getBusiness(userId: string) {
    const b = await this.prisma.business.findUnique({ where: { userId } });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  async findAll(userId: string, cupType?: string, page = 1, limit = 100) {
    const b = await this.getBusiness(userId);
    const where = { businessId: b.id, isActive: true, ...(cupType && { cupType: cupType as any }) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { recipe: { include: { inventoryItem: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const p = await this.prisma.product.findFirst({
      where: { id, businessId: b.id },
      include: { recipe: { include: { inventoryItem: true } } },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(userId: string, dto: CreateProductDto) {
    const b = await this.getBusiness(userId);
    try {
      return await this.prisma.product.create({
        data: {
          businessId: b.id,
          name: dto.name,
          nameRu: dto.nameRu,
          nameTg: dto.nameTg,
          cupType: dto.cupType,
          variant: dto.variant,
          price: toDecimal(dto.price),
          unit: dto.unit || 'piece',
          category: dto.category,
        },
      });
    } catch {
      throw new ConflictException('Product with this name already exists');
    }
  }

  async update(userId: string, id: string, dto: Partial<CreateProductDto>) {
    const b = await this.getBusiness(userId);
    const p = await this.prisma.product.findFirst({ where: { id, businessId: b.id } });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.nameRu !== undefined && { nameRu: dto.nameRu }),
        ...(dto.nameTg !== undefined && { nameTg: dto.nameTg }),
        ...(dto.cupType && { cupType: dto.cupType }),
        ...(dto.variant !== undefined && { variant: dto.variant }),
        ...(dto.price !== undefined && { price: toDecimal(dto.price) }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const b = await this.getBusiness(userId);
    const p = await this.prisma.product.findFirst({ where: { id, businessId: b.id } });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async setRecipe(userId: string, productId: string, dto: SetRecipeDto) {
    const b = await this.getBusiness(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: b.id },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.productRecipe.deleteMany({ where: { productId } });

      await tx.productRecipe.createMany({
        data: dto.items.map((item) => ({
          productId,
          inventoryItemId: item.inventoryItemId,
          quantity: toDecimal(item.quantity),
          unit: item.unit,
          notes: item.notes,
        })),
      });

      // Recalc product cost from recipe
      const recipes = await tx.productRecipe.findMany({
        where: { productId },
        include: { inventoryItem: true },
      });

      let totalCost = new Decimal(0);
      for (const r of recipes) {
        totalCost = totalCost.plus(multiplyDecimal(r.quantity, r.inventoryItem.avgCost));
      }

      await tx.product.update({ where: { id: productId }, data: { cost: totalCost } });

      return tx.product.findUnique({
        where: { id: productId },
        include: { recipe: { include: { inventoryItem: true } } },
      });
    });
  }

  async getRecipe(userId: string, productId: string) {
    const b = await this.getBusiness(userId);
    const p = await this.prisma.product.findFirst({ where: { id: productId, businessId: b.id } });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.productRecipe.findMany({
      where: { productId },
      include: { inventoryItem: true },
    });
  }

  async getMargin(userId: string, productId: string) {
    const b = await this.getBusiness(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: b.id },
      include: { recipe: { include: { inventoryItem: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    let cogs = new Decimal(0);
    for (const r of product.recipe) {
      cogs = cogs.plus(multiplyDecimal(r.quantity, r.inventoryItem.avgCost));
    }

    const price = toDecimal(product.price);
    const margin = price.minus(cogs);
    const marginPct = price.isZero() ? new Decimal(0) : margin.dividedBy(price).times(100);

    return {
      productId,
      name: product.name,
      price: price.toFixed(2),
      cogs: cogs.toFixed(2),
      margin: margin.toFixed(2),
      marginPercent: marginPct.toFixed(2),
    };
  }
}
