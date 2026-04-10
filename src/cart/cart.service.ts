import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Cart, CartDocument, CartItem } from './schemas/cart.schema';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';

export interface CartView {
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  private assertUserId(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(`User #${userId} not found`);
    }
  }

  private toView(cart: CartDocument): CartView {
    const items = cart.items.map((i) => ({
      productId: i.productId.toString(),
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    }));
    const total = Number(
      items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2),
    );
    return { userId: cart.userId.toString(), items, total };
  }

  private async loadOrCreate(userId: string): Promise<CartDocument> {
    this.assertUserId(userId);
    await this.usersService.findOne(userId);
    const existing = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (existing) return existing;
    return this.cartModel.create({
      userId: new Types.ObjectId(userId),
      items: [],
    });
  }

  async getCart(userId: string): Promise<CartView> {
    const cart = await this.loadOrCreate(userId);
    return this.toView(cart);
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartView> {
    if (quantity <= 0) throw new BadRequestException('Quantity must be > 0');
    const product = await this.productsService.findOne(productId);
    const cart = await this.loadOrCreate(userId);

    const existing = cart.items.find(
      (i) => i.productId.toString() === productId,
    );
    const newQty = (existing?.quantity ?? 0) + quantity;
    if (product.stock < newQty) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    if (existing) {
      existing.quantity = newQty;
      existing.subtotal = Number((existing.price * newQty).toFixed(2));
    } else {
      const item: CartItem = {
        productId: new Types.ObjectId(productId),
        name: product.name,
        price: product.price,
        quantity,
        subtotal: Number((product.price * quantity).toFixed(2)),
      };
      cart.items.push(item);
    }
    await cart.save();
    return this.toView(cart);
  }

  async updateItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartView> {
    if (quantity <= 0) throw new BadRequestException('Quantity must be > 0');
    const cart = await this.loadOrCreate(userId);
    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) throw new NotFoundException(`Product #${productId} not in cart`);

    const product = await this.productsService.findOne(productId);
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }
    item.quantity = quantity;
    item.subtotal = Number((item.price * quantity).toFixed(2));
    await cart.save();
    return this.toView(cart);
  }

  async removeItem(userId: string, productId: string): Promise<CartView> {
    const cart = await this.loadOrCreate(userId);
    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId,
    );
    if (idx === -1) {
      throw new NotFoundException(`Product #${productId} not in cart`);
    }
    cart.items.splice(idx, 1);
    await cart.save();
    return this.toView(cart);
  }

  async clear(userId: string): Promise<CartView> {
    const cart = await this.loadOrCreate(userId);
    cart.items = [];
    await cart.save();
    return this.toView(cart);
  }
}
