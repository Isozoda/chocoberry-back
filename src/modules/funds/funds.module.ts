import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FundsController],
  providers: [FundsService, PrismaService],
  exports: [FundsService],
})
export class FundsModule {}
