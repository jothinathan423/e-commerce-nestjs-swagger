import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { OrderStatus } from './schemas/order.schema';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order from the user cart' })
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiBody({ type: CreateOrderDto })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with optional filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
  })
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll({ userId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition order status' })
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiBody({ type: UpdateOrderStatusDto })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order and restock inventory' })
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }
}
