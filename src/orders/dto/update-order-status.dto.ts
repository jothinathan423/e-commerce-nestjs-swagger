import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @ApiProperty({
    type: String,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    example: 'paid',
  })
  status!: OrderStatus;
}
