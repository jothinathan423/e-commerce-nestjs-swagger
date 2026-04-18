import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ type: String, example: '507f1f77bcf86cd799439011' })
  productId!: string;

  @ApiProperty({ type: Number, example: 2, minimum: 1 })
  quantity!: number;
}
