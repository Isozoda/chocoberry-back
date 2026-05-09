import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService],
  exports: [SalesService],
})
export class SalesModule {}
