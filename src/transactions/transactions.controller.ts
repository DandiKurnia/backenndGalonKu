import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, Payment } from '@prisma/client';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { JwtAuthGuard } from 'src/auth/guards/legged-in.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: Request & { user: { id: number } },
  ): Promise<BaseResponse<Transaction & { payment: Payment }>> {
    const result = await this.transactionsService.create(
      req.user.id,
      createTransactionDto,
    );
    return {
      data: result,
      message: 'Transaction created successfully',
    };
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: { id: number } },
    @Query('limit') limit?: string,
  ): Promise<BaseResponse<unknown>> {
    const result = await this.transactionsService.findAll(
      req.user.id,
      limit ? Number(limit) : undefined,
    );
    return {
      data: result,
      message: 'Transactions retrieved successfully',
    };
  }

  @Get('summary')
  async getDashboardSummary(
    @Req() req: Request & { user: { id: number } },
    @Query('addressId') addressId?: string,
  ): Promise<BaseResponse<any>> {
    const summary = await this.transactionsService.getDashboardSummary(
      req.user.id,
      addressId ? Number(addressId) : undefined,
    );
    return {
      data: summary,
      message: 'Dashboard summary retrieved successfully',
    };
  }

  @Get('stats')
  async getStats(
    @Req() req: Request & { user: { id: number } },
    @Query('groupBy') groupBy?: 'daily' | 'monthly',
    @Query('addressId') addressId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<any>> {
    const stats = await this.transactionsService.getTransactionStats(
      req.user.id,
      groupBy || 'daily',
      addressId ? Number(addressId) : undefined,
      startDate,
      endDate,
    );
    return {
      data: stats,
      message: 'Transaction statistics retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: number } },
  ): Promise<BaseResponse<unknown>> {
    const result = await this.transactionsService.findOne(+id, req.user.id);
    return {
      data: result,
      message: 'Transaction retrieved successfully',
    };
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(+id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(+id);
  }
}
