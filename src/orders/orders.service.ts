import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  private assertId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Order #${id} not found`);
    }
  }

  async create(dto: CreateOrderDto): Promise<OrderDocument> {
    await this.usersService.findOne(dto.userId);
    const cart = await this.cartService.getCart(dto.userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product #${item.productId}. Available: ${product.stock}`,
        );
      }
    }

    for (const item of cart.items) {
      await this.productsService.decrementStock(item.productId, item.quantity);
    }

    const order = await this.orderModel.create({
      userId: new Types.ObjectId(dto.userId),
      items: cart.items.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })),
      total: cart.total,
      status: 'pending',
      shippingAddress: dto.shippingAddress,
    });

    await this.cartService.clear(dto.userId);
    return order;
  }

  async findAll(filter?: {
    userId?: string;
    status?: OrderStatus;
  }): Promise<OrderDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.userId && isValidObjectId(filter.userId)) {
      query.userId = new Types.ObjectId(filter.userId);
    }
    if (filter?.status) query.status = filter.status;
    return this.orderModel.find(query).exec();
  }

  async findOne(id: string): Promise<OrderDocument> {
    this.assertId(id);
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderDocument> {
    const order = await this.findOne(id);
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from '${order.status}' to '${status}'`,
      );
    }
    order.status = status;
    await order.save();
    return order;
  }

  async cancel(id: string): Promise<OrderDocument> {
    const order = await this.findOne(id);
    if (order.status === 'cancelled') return order;
    if (order.status === 'delivered' || order.status === 'shipped') {
      throw new BadRequestException(`Cannot cancel a ${order.status} order`);
    }
    for (const item of order.items) {
      await this.productsService.incrementStock(
        item.productId.toString(),
        item.quantity,
      );
    }
    order.status = 'cancelled';
    await order.save();
    return order;
  }
}
