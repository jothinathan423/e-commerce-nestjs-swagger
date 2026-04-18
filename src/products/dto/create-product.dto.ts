import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ type: String, example: 'iPhone 15' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: '128GB, Blue' })
  description?: string;

  @ApiProperty({ type: Number, example: 799.0, minimum: 0 })
  price!: number;

  @ApiProperty({ type: Number, example: 25, minimum: 0 })
  stock!: number;

  @ApiProperty({ type: String, example: '507f1f77bcf86cd799439011' })
  categoryId!: string;
}
