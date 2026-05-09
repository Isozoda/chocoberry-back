import { Module } from '@nestjs/common';
import { CashboxController } from './cashbox.controller';
import { CashboxService } from './cashbox.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [CashboxController],
  providers: [CashboxService, PrismaService],
  exports: [CashboxService],
})
export class CashboxModule {}
