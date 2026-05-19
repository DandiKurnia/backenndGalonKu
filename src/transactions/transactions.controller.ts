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
  ): Promise<BaseResponse<unknown>> {
    const result = await this.transactionsService.findAll(req.user.id);
    return {
      data: result,
      message: 'Transactions retrieved successfully',
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
