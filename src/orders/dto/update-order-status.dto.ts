import type { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  status!: OrderStatus;
}
