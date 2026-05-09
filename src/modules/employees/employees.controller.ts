import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { PayEmployeeDto } from './dto/pay-employee.dto';
import { CreateFineDto } from './dto/create-fine.dto';
import { CalcPayrollDto } from './dto/calc-payroll.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('employees')
@ApiBearerAuth('JWT')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List all employees' })
  findAll(@CurrentUser() user: any) {
    return this.employeesService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create employee' })
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.id, dto);
  }

  @Post('payroll/calculate-month')
  @ApiOperation({ summary: 'Calculate monthly payroll for all employees' })
  calculateMonthlyPayroll(@CurrentUser() user: any, @Body() dto: CalcPayrollDto) {
    return this.employeesService.calculateMonthlyPayroll(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate employee' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.remove(user.id, id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay employee (salary, advance, bonus, owner draw)' })
  pay(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: PayEmployeeDto) {
    return this.employeesService.pay(user.id, id, dto);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get employee payment history' })
  getPayments(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.getPayments(user.id, id);
  }

  @Post(':id/fine')
  @ApiOperation({ summary: 'Create fine for employee' })
  createFine(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateFineDto) {
    return this.employeesService.createFine(user.id, id, dto);
  }

  @Get(':id/fines')
  @ApiOperation({ summary: 'Get employee fines' })
  getFines(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.getFines(user.id, id);
  }

  @Get(':id/shifts')
  @ApiOperation({ summary: 'Get employee shifts' })
  getShifts(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.getShifts(user.id, id);
  }

  @Post(':id/shifts')
  @ApiOperation({ summary: 'Log employee shift' })
  createShift(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateShiftDto) {
    return this.employeesService.createShift(user.id, id, dto);
  }

  @Get(':id/payroll/:month')
  @ApiOperation({ summary: 'Get calculated payroll for employee for specific month' })
  getPayrollForMonth(@CurrentUser() user: any, @Param('id') id: string, @Param('month') month: string) {
    return this.employeesService.getPayrollForMonth(user.id, id, month);
  }
}
