import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
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

describe('CartService', () => {
  let cartService: CartService;
  let productsService: ProductsService;
  let usersService: UsersService;
  let categoriesService: CategoriesService;
  let connection: Connection;
  let module: TestingModule;
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Cart.name, schema: CartSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Category.name, schema: CategorySchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
      providers: [CartService, ProductsService, CategoriesService, UsersService],
    }).compile();

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
    await connection.collection('carts').deleteMany({});
    await connection.collection('products').deleteMany({});
    await connection.collection('categories').deleteMany({});
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeInMongodConnection();
  });

  it('returns an empty cart for a new user', async () => {
    const cart = await cartService.getCart(userId);
    expect(cart.items).toEqual([]);
    expect(cart.total).toBe(0);
  });

  it('throws when the user does not exist', async () => {
    await expect(
      cartService.getCart('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds an item and computes totals', async () => {
    const cart = await cartService.addItem(userId, productId, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].subtotal).toBe(200);
    expect(cart.total).toBe(200);
  });

  it('merges duplicate additions', async () => {
    await cartService.addItem(userId, productId, 1);
    const cart = await cartService.addItem(userId, productId, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
    expect(cart.total).toBe(300);
  });

  it('rejects quantities beyond stock', async () => {
    await expect(
      cartService.addItem(userId, productId, 99),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects zero/negative quantity', async () => {
    await expect(
      cartService.addItem(userId, productId, 0),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates an existing item quantity', async () => {
    await cartService.addItem(userId, productId, 1);
    const cart = await cartService.updateItem(userId, productId, 4);
    expect(cart.items[0].quantity).toBe(4);
    expect(cart.total).toBe(400);
  });

  it('update throws if the item is not in the cart', async () => {
    await expect(
      cartService.updateItem(userId, productId, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes an item', async () => {
    await cartService.addItem(userId, productId, 2);
    const cart = await cartService.removeItem(userId, productId);
    expect(cart.items).toHaveLength(0);
    expect(cart.total).toBe(0);
  });

  it('clear empties the cart', async () => {
    await cartService.addItem(userId, productId, 2);
    const cart = await cartService.clear(userId);
    expect(cart.items).toHaveLength(0);
  });
});
