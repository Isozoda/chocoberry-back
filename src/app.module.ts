import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { BusinessModule } from './modules/business/business.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CashboxModule } from './modules/cashbox/cashbox.module';
import { FundsModule } from './modules/funds/funds.module';
import { DailyReportModule } from './modules/daily-report/daily-report.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { FixedExpensesModule } from './modules/fixed-expenses/fixed-expenses.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    AttendanceModule,
    BusinessModule,
    SuppliersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    ExpensesModule,
    EmployeesModule,
    CashboxModule,
    FundsModule,
    DailyReportModule,
    ReportsModule,
    TelegramModule,
    FixedExpensesModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
