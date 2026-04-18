import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ type: String, example: 'Jothinathan' })
  name!: string;

  @ApiProperty({ type: String, example: 'jothi@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'secret123' })
  password!: string;

  @ApiPropertyOptional({
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  })
  role?: 'customer' | 'admin';
}
