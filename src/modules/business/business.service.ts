import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import Decimal from 'decimal.js';
import { toDecimal } from '../../common/utils/decimal.util';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async setup(userId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Business already set up for this user');

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type || 'FOOD',
          address: dto.address,
          phone: dto.phone,
          currency: 'TJS',
          bonusPercent: new Decimal(2.0),
        },
      });

      const bid = business.id;

      // CATEGORIES
      await tx.category.createMany({
        data: [
          {
            businessId: bid,
            name: 'Стакан 0.3',
            nameRu: 'Стакан 0.3',
            nameTg: 'Стакан 0.3',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Стакан 0.4',
            nameRu: 'Стакан 0.4',
            nameTg: 'Стакан 0.4',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Трайфл',
            nameRu: 'Трайфл',
            nameTg: 'Трайфл',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Шок-коктейл',
            nameRu: 'Шок-коктейл',
            nameTg: 'Шок-коктейл',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Мороженое',
            nameRu: 'Мороженое',
            nameTg: 'Мороженое',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Чой',
            nameRu: 'Чай',
            nameTg: 'Чой',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Напитки',
            nameRu: 'Напитки',
            nameTg: 'Нӯшокиҳо',
            type: 'INCOME',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Иҷора',
            nameRu: 'Аренда',
            nameTg: 'Иҷора',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Барқ',
            nameRu: 'Электричество',
            nameTg: 'Барқ',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Об',
            nameRu: 'Вода',
            nameTg: 'Об',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Газ',
            nameRu: 'Газ',
            nameTg: 'Газ',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Интернет',
            nameRu: 'Интернет',
            nameTg: 'Интернет',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Андоз',
            nameRu: 'Налог',
            nameTg: 'Андоз',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Коммунал',
            nameRu: 'Коммунальные',
            nameTg: 'Коммунал',
            type: 'EXPENSE',
            expenseType: 'FIXED',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Расходники',
            nameRu: 'Расходники',
            nameTg: 'Расходникҳо',
            type: 'EXPENSE',
            expenseType: 'CONSUMABLE',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Масрафҳо',
            nameRu: 'Прочие расходы',
            nameTg: 'Масрафҳо',
            type: 'EXPENSE',
            expenseType: 'VARIABLE',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Маош',
            nameRu: 'Зарплата',
            nameTg: 'Маош',
            type: 'EXPENSE',
            expenseType: 'PAYROLL',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Бонус',
            nameRu: 'Бонус',
            nameTg: 'Бонус',
            type: 'EXPENSE',
            expenseType: 'PAYROLL',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Хӯрок',
            nameRu: 'Питание',
            nameTg: 'Хӯрок',
            type: 'EXPENSE',
            expenseType: 'PAYROLL',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Аванс',
            nameRu: 'Аванс',
            nameTg: 'Аванс',
            type: 'EXPENSE',
            expenseType: 'PAYROLL',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Ҷарима',
            nameRu: 'Штраф',
            nameTg: 'Ҷарима',
            type: 'EXPENSE',
            expenseType: 'PAYROLL',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Расходники Раис',
            nameRu: 'Изъятия владельца',
            nameTg: 'Расходники Раис',
            type: 'EXPENSE',
            expenseType: 'OWNER_DRAW',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Брак',
            nameRu: 'Брак/Списание',
            nameTg: 'Брак',
            type: 'EXPENSE',
            expenseType: 'WASTE',
            isDefault: true,
          },
          {
            businessId: bid,
            name: 'Фондҳо',
            nameRu: 'Фонды',
            nameTg: 'Фондҳо',
            type: 'EXPENSE',
            expenseType: 'FUND',
            isDefault: true,
          },
        ],
      });

      // SUPPLIERS
      const suppliers = await Promise.all([
        tx.supplier.create({ data: { businessId: bid, name: 'Аки Талабшоҳ', type: 'FRUIT' } }),
        tx.supplier.create({ data: { businessId: bid, name: 'Шоколадфурӯш', type: 'CHOCOLATE' } }),
        tx.supplier.create({ data: { businessId: bid, name: 'Наимшоҳ', type: 'PACKAGING' } }),
        tx.supplier.create({ data: { businessId: bid, name: 'Фаррух', type: 'PACKAGING' } }),
      ]);

      // INVENTORY ITEMS
      const fruits = await Promise.all([
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Клубника',
            nameRu: 'Клубника',
            nameTg: 'Қулфинай',
            unit: 'KG',
            minStockLevel: new Decimal(5),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(15),
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Банан',
            nameRu: 'Банан',
            nameTg: 'Банан',
            unit: 'KG',
            minStockLevel: new Decimal(3),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(20),
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Ананас',
            nameRu: 'Ананас',
            nameTg: 'Ананас',
            unit: 'KG',
            minStockLevel: new Decimal(2),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(40),
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Киви',
            nameRu: 'Киви',
            nameTg: 'Киви',
            unit: 'KG',
            minStockLevel: new Decimal(2),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(15),
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Апелсин',
            nameRu: 'Апельсин',
            nameTg: 'Апелсин',
            unit: 'KG',
            minStockLevel: new Decimal(3),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(30),
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Себ',
            nameRu: 'Яблоко',
            nameTg: 'Себ',
            unit: 'KG',
            minStockLevel: new Decimal(2),
            category: 'FRUIT',
            cleaningLossPct: new Decimal(15),
          },
        }),
      ]);

      const chocolate = await Promise.all([
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Шоколад майда',
            nameRu: 'Шоколад мелкий',
            nameTg: 'Шоколади майда',
            unit: 'KG',
            minStockLevel: new Decimal(2),
            category: 'CHOCOLATE',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Шоколад калон',
            nameRu: 'Шоколад крупный',
            nameTg: 'Шоколади калон',
            unit: 'KG',
            minStockLevel: new Decimal(2),
            category: 'CHOCOLATE',
          },
        }),
      ]);

      const packaging = await Promise.all([
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стакан 0.3 ml',
            nameRu: 'Стакан 0.3 мл',
            nameTg: 'Стакани 0.3 мл',
            unit: 'PIECE',
            minStockLevel: new Decimal(100),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стакан 0.4 ml',
            nameRu: 'Стакан 0.4 мл (с крышкой)',
            nameTg: 'Стакани 0.4 мл',
            unit: 'PIECE',
            minStockLevel: new Decimal(100),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стакан 80 см',
            nameRu: 'Стакан 80 см',
            nameTg: 'Стакани 80 см',
            unit: 'PIECE',
            minStockLevel: new Decimal(50),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стакан 90 см',
            nameRu: 'Стакан 90 см (4-секции)',
            nameTg: 'Стакани 90 см',
            unit: 'PIECE',
            minStockLevel: new Decimal(50),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стакан мороженое',
            nameRu: 'Стакан мороженое',
            nameTg: 'Стакани мороженое',
            unit: 'PIECE',
            minStockLevel: new Decimal(50),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Салфетка влажная',
            nameRu: 'Салфетка влажная',
            nameTg: 'Дастмол тар',
            unit: 'BLOCK',
            minStockLevel: new Decimal(5),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Салфетка сухая',
            nameRu: 'Салфетка сухая',
            nameTg: 'Дастмол хушк',
            unit: 'PACK',
            minStockLevel: new Decimal(10),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Қошуқчаи мороженӣ',
            nameRu: 'Ложки для мороженого',
            nameTg: 'Қошуқчаи мороженӣ',
            unit: 'PIECE',
            minStockLevel: new Decimal(200),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Вилка для клубники',
            nameRu: 'Вилка для клубники',
            nameTg: 'Чанголи қулфинай',
            unit: 'PIECE',
            minStockLevel: new Decimal(100),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Целлофан мелкий',
            nameRu: 'Целлофан мелкий',
            nameTg: 'Целлофани хурд',
            unit: 'PACK',
            minStockLevel: new Decimal(3),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Целлофан крупный',
            nameRu: 'Целлофан крупный',
            nameTg: 'Целлофани калон',
            unit: 'PACK',
            minStockLevel: new Decimal(3),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Стикер',
            nameRu: 'Стикер',
            nameTg: 'Стикер',
            unit: 'PIECE',
            minStockLevel: new Decimal(200),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Трубочка',
            nameRu: 'Трубочка',
            nameTg: 'Найча',
            unit: 'PIECE',
            minStockLevel: new Decimal(200),
            category: 'PACKAGING',
          },
        }),
        tx.inventoryItem.create({
          data: {
            businessId: bid,
            name: 'Крышка',
            nameRu: 'Крышка',
            nameTg: 'Қопқоқ',
            unit: 'PIECE',
            minStockLevel: new Decimal(100),
            category: 'PACKAGING',
          },
        }),
      ]);

      // shorthand
      const [strawberry, banana, ananas, kiwi] = fruits;
      const [chocoSmall] = chocolate;
      const [cup03, cup04, , , , , , spoon, fork] = packaging;

      // PRODUCTS
      const p1 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Стакан 0.3 Клубника',
          nameRu: 'Стакан 0.3 Чистая клубника',
          nameTg: 'Стакани 0.3 Қулфинай',
          cupType: 'CUP_300_ML',
          variant: 'PURE',
          price: new Decimal(35),
          unit: 'piece',
        },
      });
      const p2 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Стакан 0.3 Микс',
          nameRu: 'Стакан 0.3 Микс',
          nameTg: 'Стакани 0.3 Омехта',
          cupType: 'CUP_300_ML',
          variant: 'MIX',
          price: new Decimal(30),
          unit: 'piece',
        },
      });
      const p3 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Стакан 0.4 Клубника',
          nameRu: 'Стакан 0.4 Чистая клубника',
          nameTg: 'Стакани 0.4 Қулфинай',
          cupType: 'CUP_400_ML',
          variant: 'PURE',
          price: new Decimal(45),
          unit: 'piece',
        },
      });
      const p4 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Стакан 0.4 Дабл',
          nameRu: 'Стакан 0.4 Двойной микс',
          nameTg: 'Стакани 0.4 Дабл',
          cupType: 'CUP_400_ML',
          variant: 'DOUBLE_MIX',
          price: new Decimal(40),
          unit: 'piece',
        },
      });
      const p5 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Стакан 0.4 Трипл',
          nameRu: 'Стакан 0.4 Тройной микс',
          nameTg: 'Стакани 0.4 Трипл',
          cupType: 'CUP_400_ML',
          variant: 'TRIPLE_MIX',
          price: new Decimal(50),
          unit: 'piece',
        },
      });
      const p6 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Трайфл',
          nameRu: 'Трайфл',
          nameTg: 'Трайфл',
          price: new Decimal(25),
          unit: 'piece',
        },
      });
      const p7 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Шоколад коктейл',
          nameRu: 'Шоколадный коктейль',
          nameTg: 'Коктейли шоколад',
          price: new Decimal(20),
          unit: 'piece',
        },
      });
      const p8 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Мороженое',
          nameRu: 'Мороженое',
          nameTg: 'Мороженое',
          cupType: 'CUP_ICE_CREAM',
          price: new Decimal(15),
          unit: 'piece',
        },
      });
      const p9 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Чой',
          nameRu: 'Чай',
          nameTg: 'Чой',
          price: new Decimal(8),
          unit: 'piece',
        },
      });
      const p10 = await tx.product.create({
        data: {
          businessId: bid,
          name: 'Напитки',
          nameRu: 'Напитки',
          nameTg: 'Нӯшокиҳо',
          price: new Decimal(10),
          unit: 'piece',
        },
      });

      // RECIPES
      await tx.productRecipe.createMany({
        data: [
          // Cup 0.3 Pure Strawberry
          {
            productId: p1.id,
            inventoryItemId: strawberry.id,
            quantity: new Decimal(0.1),
            unit: 'KG',
          },
          {
            productId: p1.id,
            inventoryItemId: chocoSmall.id,
            quantity: new Decimal(0.05),
            unit: 'KG',
          },
          { productId: p1.id, inventoryItemId: cup03.id, quantity: new Decimal(1), unit: 'PIECE' },
          { productId: p1.id, inventoryItemId: spoon.id, quantity: new Decimal(1), unit: 'PIECE' },
          // Cup 0.3 Mix
          {
            productId: p2.id,
            inventoryItemId: strawberry.id,
            quantity: new Decimal(0.05),
            unit: 'KG',
          },
          { productId: p2.id, inventoryItemId: banana.id, quantity: new Decimal(0.05), unit: 'KG' },
          {
            productId: p2.id,
            inventoryItemId: chocoSmall.id,
            quantity: new Decimal(0.05),
            unit: 'KG',
          },
          { productId: p2.id, inventoryItemId: cup03.id, quantity: new Decimal(1), unit: 'PIECE' },
          { productId: p2.id, inventoryItemId: spoon.id, quantity: new Decimal(1), unit: 'PIECE' },
          // Cup 0.4 Pure Strawberry
          {
            productId: p3.id,
            inventoryItemId: strawberry.id,
            quantity: new Decimal(0.12),
            unit: 'KG',
          },
          {
            productId: p3.id,
            inventoryItemId: chocoSmall.id,
            quantity: new Decimal(0.06),
            unit: 'KG',
          },
          { productId: p3.id, inventoryItemId: cup04.id, quantity: new Decimal(1), unit: 'PIECE' },
          { productId: p3.id, inventoryItemId: spoon.id, quantity: new Decimal(1), unit: 'PIECE' },
          // Cup 0.4 Double
          {
            productId: p4.id,
            inventoryItemId: strawberry.id,
            quantity: new Decimal(0.06),
            unit: 'KG',
          },
          { productId: p4.id, inventoryItemId: banana.id, quantity: new Decimal(0.06), unit: 'KG' },
          {
            productId: p4.id,
            inventoryItemId: chocoSmall.id,
            quantity: new Decimal(0.06),
            unit: 'KG',
          },
          { productId: p4.id, inventoryItemId: cup04.id, quantity: new Decimal(1), unit: 'PIECE' },
          // Cup 0.4 Triple
          {
            productId: p5.id,
            inventoryItemId: strawberry.id,
            quantity: new Decimal(0.04),
            unit: 'KG',
          },
          { productId: p5.id, inventoryItemId: banana.id, quantity: new Decimal(0.04), unit: 'KG' },
          { productId: p5.id, inventoryItemId: ananas.id, quantity: new Decimal(0.05), unit: 'KG' },
          {
            productId: p5.id,
            inventoryItemId: chocoSmall.id,
            quantity: new Decimal(0.05),
            unit: 'KG',
          },
          { productId: p5.id, inventoryItemId: cup04.id, quantity: new Decimal(1), unit: 'PIECE' },
        ],
      });

      // EMPLOYEES
      await tx.employee.createMany({
        data: [
          {
            businessId: bid,
            name: 'Сафиалло',
            role: 'OWNER',
            isOwner: true,
            salary: new Decimal(500),
            salaryType: 'DAILY',
          },
          {
            businessId: bid,
            name: 'Шамс',
            role: 'OWNER',
            isOwner: true,
            salary: new Decimal(500),
            salaryType: 'DAILY',
          },
          { businessId: bid, name: 'Эҳсон', role: 'STAFF' },
          { businessId: bid, name: 'Шоди', role: 'STAFF' },
          { businessId: bid, name: 'Меҳрубон', role: 'STAFF' },
          { businessId: bid, name: 'Наимшоҳ', role: 'STAFF', isConsumableBuyer: true },
          { businessId: bid, name: 'Фаррух', role: 'STAFF', isConsumableBuyer: true },
          { businessId: bid, name: 'Шодрӯз', role: 'STAFF' },
          { businessId: bid, name: 'Шуҳрат', role: 'STAFF' },
          { businessId: bid, name: 'Ҷовидон', role: 'STAFF' },
          { businessId: bid, name: 'Муҳаммад', role: 'STAFF' },
        ],
      });

      // FUNDS
      await tx.fund.createMany({
        data: [
          { businessId: bid, type: 'CHARITY', name: 'Фонди Хайр', balance: new Decimal(0) },
          { businessId: bid, type: 'RESERVE', name: 'Фонди Захиравӣ', balance: new Decimal(0) },
          { businessId: bid, type: 'RENOVATION', name: 'Фонди Ободонӣ', balance: new Decimal(0) },
          { businessId: bid, type: 'EMERGENCY', name: 'Рӯзи Мабодо', balance: new Decimal(0) },
          { businessId: bid, type: 'TAX_RESERVE', name: 'Захираи Андоз', balance: new Decimal(0) },
        ],
      });

      // CASHBOX
      await tx.cashbox.create({
        data: {
          businessId: bid,
          balance: new Decimal(0),
          cardBalance: new Decimal(0),
          currency: 'TJS',
        },
      });

      const result = await tx.business.findUnique({
        where: { id: bid },
        include: {
          suppliers: true,
          employees: true,
          funds: true,
          cashbox: true,
          categories: true,
          inventoryItems: true,
          products: true,
        },
      });

      return {
        business: result,
        inventoryCount: result.inventoryItems.length,
        productCount: result.products.length,
        employeeCount: result.employees.length,
        fundCount: result.funds.length,
        supplierCount: result.suppliers.length,
        categoryCount: result.categories.length,
      };
    });
  }

  async getProfile(userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { userId },
      include: { cashbox: true },
    });
    if (!business)
      throw new NotFoundException('Business not found. Call POST /business/setup first.');
    return business;
  }

  async updateProfile(userId: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.business.findUnique({ where: { userId } });
    if (!business) throw new NotFoundException('Business not found');

    return this.prisma.business.update({
      where: { id: business.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.bonusPercent !== undefined && { bonusPercent: new Decimal(dto.bonusPercent) }),
      },
    });
  }

  async getDashboard(userId: string) {
    const business = await this.prisma.business.findUnique({ where: { userId } });
    if (!business) throw new NotFoundException('Business not found');

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 86400000);

    // Build last 7 days date range
    const sevenDaysAgo = new Date(start.getTime() - 6 * 86400000);

    const [sales, expenses, cashbox, lowStock, last7DaysRaw] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: business.id, date: { gte: start, lt: end }, status: 'COMPLETED' },
        _sum: { total: true, cashAmount: true, cardAmount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { businessId: business.id, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.cashbox.findUnique({ where: { businessId: business.id } }),
      this.prisma.inventoryItem.findMany({
        where: { businessId: business.id, isActive: true },
        take: 50,
      }),
      this.prisma.sale.findMany({
        where: {
          businessId: business.id,
          date: { gte: sevenDaysAgo, lt: end },
          status: 'COMPLETED',
        },
        select: { date: true, total: true },
      }),
    ]);

    const lowStockCount = lowStock.filter((item) =>
      toDecimal(item.currentStock).lessThanOrEqualTo(toDecimal(item.minStockLevel)),
    ).length;

    // Aggregate per day
    const dayMap: Record<string, { total: Decimal; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { total: new Decimal(0), count: 0 };
    }
    for (const s of last7DaysRaw) {
      const key = new Date(s.date).toISOString().slice(0, 10);
      if (dayMap[key]) {
        dayMap[key].total = dayMap[key].total.plus(toDecimal(s.total));
        dayMap[key].count += 1;
      }
    }
    const last7DaysSales = Object.entries(dayMap).map(([date, v]) => ({
      date,
      total: v.total.toFixed(2),
      count: v.count,
    }));

    const cashBalance = cashbox ? toDecimal(cashbox.balance) : new Decimal(0);
    const cardBalance = cashbox ? toDecimal(cashbox.cardBalance) : new Decimal(0);

    return {
      todaySales: toDecimal(sales._sum.total || 0).toFixed(2),
      todayCash: toDecimal(sales._sum.cashAmount || 0).toFixed(2),
      todayCard: toDecimal(sales._sum.cardAmount || 0).toFixed(2),
      todaySaleCount: sales._count,
      todayExpenses: toDecimal(expenses._sum.amount || 0).toFixed(2),
      cashboxBalance: cashBalance.toFixed(2),
      cardBalance: cardBalance.toFixed(2),
      totalBalance: cashBalance.plus(cardBalance).toFixed(2),
      lowStockCount,
      last7DaysSales,
    };
  }
}
