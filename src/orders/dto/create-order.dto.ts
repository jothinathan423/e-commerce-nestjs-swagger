import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ type: String, example: '507f1f77bcf86cd799439011' })
  userId!: string;

  @ApiProperty({ type: String, example: '123 Main St, Chennai, India' })
  shippingAddress!: string;
}
