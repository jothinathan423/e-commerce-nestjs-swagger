import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ type: String, example: 'Electronics' })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Phones, laptops, accessories',
  })
  description?: string;
}
