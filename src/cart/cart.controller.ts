import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('users/:userId/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "View a user's cart" })
  getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiBody({ type: AddToCartDto })
  addItem(@Param('userId') userId: string, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(userId, dto.productId, dto.quantity);
  }





  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiBody({ type: UpdateCartItemDto })
  updateItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, productId, dto.quantity);
  }


  
  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  removeItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the cart' })
  clear(@Param('userId') userId: string) {
    return this.cartService.clear(userId);
  }
}
