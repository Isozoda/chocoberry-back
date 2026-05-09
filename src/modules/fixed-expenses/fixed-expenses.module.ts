import { Module } from '@nestjs/common';
import { FixedExpensesController } from './fixed-expenses.controller';
import { FixedExpensesService } from './fixed-expenses.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService, PrismaService],
  exports: [FixedExpensesService],
})
export class FixedExpensesModule {}
