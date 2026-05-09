import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('business')
@ApiBearerAuth('JWT')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Set up business and seed all defaults (suppliers, products, inventory, funds)' })
  @ApiResponse({ status: 201, description: 'Business created with all defaults seeded' })
  @ApiResponse({ status: 409, description: 'Business already set up' })
  setup(@CurrentUser() user: any, @Body() dto: CreateBusinessDto) {
    return this.businessService.setup(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get business profile' })
  @ApiResponse({ status: 200 })
  get(@CurrentUser() user: any) {
    return this.businessService.getProfile(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get business profile (alias)' })
  @ApiResponse({ status: 200 })
  getProfile(@CurrentUser() user: any) {
    return this.businessService.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update business profile' })
  @ApiResponse({ status: 200 })
  update(@CurrentUser() user: any, @Body() dto: UpdateBusinessDto) {
    return this.businessService.updateProfile(user.id, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update business profile (alias)' })
  @ApiResponse({ status: 200 })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateBusinessDto) {
    return this.businessService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get today\'s dashboard summary' })
  @ApiResponse({ status: 200 })
  async getDashboard(@CurrentUser() user: any) {
    try {
      return await this.businessService.getDashboard(user.id);
    } catch (error) {
      console.error('Dashboard Error:', error);
      throw error;
    }
  }
}
