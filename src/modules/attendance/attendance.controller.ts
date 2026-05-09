import { Controller, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('attendance')
@ApiBearerAuth('JWT')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily attendance for all employees' })
  getDaily(@CurrentUser() user: any, @Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.attendanceService.getDaily(user.id, d);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly attendance grid' })
  getWeekly(@CurrentUser() user: any, @Query('weekStart') weekStart: string) {
    return this.attendanceService.getWeekly(user.id, weekStart);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly attendance summary with salary calculation' })
  getMonthlySummary(@CurrentUser() user: any, @Query('month') month: string) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.attendanceService.getMonthlySummary(user.id, m);
  }

  @Put(':employeeId')
  @ApiOperation({ summary: 'Upsert attendance record for an employee' })
  upsertRecord(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertAttendanceDto,
  ) {
    return this.attendanceService.upsertRecord(user.id, employeeId, dto);
  }

  @Delete(':employeeId/:date')
  @ApiOperation({ summary: 'Delete attendance record for an employee on a date' })
  deleteRecord(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.deleteRecord(user.id, employeeId, date);
  }
}
