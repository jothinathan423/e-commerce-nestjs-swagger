import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { CartService } from '../cart/cart.service';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';
import { ProductsService } from '../products/products.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { CategoriesService } from '../categories/categories.service';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { UsersService } from '../users/users.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
} from '../../test/mongo-test-setup';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let cartService: CartService;
  let productsService: ProductsService;
  let usersService: UsersService;
  let categoriesService: CategoriesService;
  let connection: Connection;
  let module: TestingModule;
  let userId: string;
  let productId: string;

  const seedCart = async (quantity = 2) => {
    await cartService.addItem(userId, productId, quantity);
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Order.name, schema: OrderSchema },
          { name: Cart.name, schema: CartSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Category.name, schema: CategorySchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
      providers: [
        OrdersService,
        CartService,
        ProductsService,
        CategoriesService,
        UsersService,
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    cartService = module.get<CartService>(CartService);
    productsService = module.get<ProductsService>(ProductsService);
    usersService = module.get<UsersService>(UsersService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    connection = module.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    const user = await usersService.create({
      name: 'Alice',
      email: 'a@x.com',
      password: 'p',
    });
    userId = user._id.toString();
    const cat = await categoriesService.create({ name: 'Electronics' });
    const product = await productsService.create({
      name: 'Phone',
      price: 100,
      stock: 5,
      categoryId: cat._id.toString(),
    });
    productId = product._id.toString();
  });

  afterEach(async () => {
    await connection.collection('orders').deleteMany({});
    await connection.collection('carts').deleteMany({});
    await connection.collection('products').deleteMany({});
    await connection.collection('categories').deleteMany({});
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeInMongodConnection();
  });

  describe('create (checkout)', () => {
    it('creates an order from the cart and decrements stock', async () => {
      await seedCart(2);
      const order = await ordersService.create({
        userId,
        shippingAddress: '123 Main St',
      });
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.total).toBe(200);
      expect(order.status).toBe('pending');
      expect((await productsService.findOne(productId)).stock).toBe(3);
    });

    it('clears the cart after checkout', async () => {
      await seedCart(1);
      await ordersService.create({ userId, shippingAddress: 'X' });
      const cart = await cartService.getCart(userId);
      expect(cart.items).toHaveLength(0);
    });

    it('rejects checkout with an empty cart', async () => {
      await expect(
        ordersService.create({ userId, shippingAddress: 'X' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('status transitions', () => {
    it('walks through pending -> paid -> shipped -> delivered', async () => {
      await seedCart(1);
      const order = await ordersService.create({ userId, shippingAddress: 'X' });
      const id = order._id.toString();
      expect((await ordersService.updateStatus(id, 'paid')).status).toBe('paid');
      expect((await ordersService.updateStatus(id, 'shipped')).status).toBe(
        'shipped',
      );
      expect((await ordersService.updateStatus(id, 'delivered')).status).toBe(
        'delivered',
      );
    });

    it('rejects invalid transitions', async () => {
      await seedCart(1);
      const order = await ordersService.create({ userId, shippingAddress: 'X' });
      await expect(
        ordersService.updateStatus(order._id.toString(), 'delivered'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending order and restocks inventory', async () => {
      await seedCart(2);
      const order = await ordersService.create({ userId, shippingAddress: 'X' });
      expect((await productsService.findOne(productId)).stock).toBe(3);
      const cancelled = await ordersService.cancel(order._id.toString());
      expect(cancelled.status).toBe('cancelled');
      expect((await productsService.findOne(productId)).stock).toBe(5);
    });

    it('rejects cancellation of a shipped order', async () => {
      await seedCart(1);
      const order = await ordersService.create({ userId, shippingAddress: 'X' });
      const id = order._id.toString();
      await ordersService.updateStatus(id, 'paid');
      await ordersService.updateStatus(id, 'shipped');
      await expect(ordersService.cancel(id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('findAll/findOne', () => {
    it('filters by user and status', async () => {
      await seedCart(1);
      const order = await ordersService.create({ userId, shippingAddress: 'X' });
      expect(await ordersService.findAll({ userId })).toHaveLength(1);
      expect(await ordersService.findAll({ status: 'pending' })).toHaveLength(1);
      expect(await ordersService.findAll({ status: 'delivered' })).toHaveLength(
        0,
      );
      const found = await ordersService.findOne(order._id.toString());
      expect(found._id.toString()).toBe(order._id.toString());
    });

    it('findOne throws for unknown id', async () => {
      await expect(
        ordersService.findOne('507f1f77bcf86cd799439011'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
