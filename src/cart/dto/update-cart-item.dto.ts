import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ type: Number, example: 3, minimum: 1 })
  quantity!: number;
}
