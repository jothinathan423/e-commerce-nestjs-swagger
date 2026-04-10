import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { CategoriesService } from '../categories/categories.service';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
} from '../../test/mongo-test-setup';

describe('ProductsService', () => {
  let service: ProductsService;
  let categoriesService: CategoriesService;
  let connection: Connection;
  let module: TestingModule;
  let categoryId: string;
  let booksId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Product.name, schema: ProductSchema },
          { name: Category.name, schema: CategorySchema },
        ]),
      ],
      providers: [ProductsService, CategoriesService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    connection = module.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    const cat = await categoriesService.create({ name: 'Electronics' });
    const books = await categoriesService.create({ name: 'Books' });
    categoryId = cat._id.toString();
    booksId = books._id.toString();
  });

  afterEach(async () => {
    await connection.collection('products').deleteMany({});
    await connection.collection('categories').deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeInMongodConnection();
  });

  describe('create', () => {
    it('creates a product under an existing category', async () => {
      const product = await service.create({
        name: 'Phone',
        price: 500,
        stock: 10,
        categoryId,
      });
      expect(product._id).toBeDefined();
      expect(product.categoryId.toString()).toBe(categoryId);
    });

    it('throws if category is missing', async () => {
      await expect(
        service.create({
          name: 'X',
          price: 1,
          stock: 1,
          categoryId: '507f1f77bcf86cd799439011',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects negative price', async () => {
      await expect(
        service.create({ name: 'X', price: -1, stock: 1, categoryId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects negative stock', async () => {
      await expect(
        service.create({ name: 'X', price: 1, stock: -1, categoryId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll filters', () => {
    beforeEach(async () => {
      await service.create({ name: 'Phone', price: 500, stock: 5, categoryId });
      await service.create({
        name: 'Laptop',
        price: 1500,
        stock: 3,
        categoryId,
      });
      await service.create({
        name: 'Clean Code',
        price: 30,
        stock: 20,
        categoryId: booksId,
      });
    });

    it('filters by category', async () => {
      const list = await service.findAll({ categoryId });
      expect(list).toHaveLength(2);
    });

    it('filters by search term', async () => {
      const list = await service.findAll({ search: 'phone' });
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Phone');
    });

    it('combines filters', async () => {
      const list = await service.findAll({ categoryId, search: 'clean' });
      expect(list).toHaveLength(0);
    });
  });

  describe('stock helpers', () => {
    it('decrements and increments stock', async () => {
      const product = await service.create({
        name: 'Phone',
        price: 500,
        stock: 10,
        categoryId,
      });
      const id = product._id.toString();
      await service.decrementStock(id, 3);
      expect((await service.findOne(id)).stock).toBe(7);
      await service.incrementStock(id, 2);
      expect((await service.findOne(id)).stock).toBe(9);
    });

    it('rejects decrement larger than stock', async () => {
      const product = await service.create({
        name: 'Phone',
        price: 500,
        stock: 2,
        categoryId,
      });
      await expect(
        service.decrementStock(product._id.toString(), 5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update/remove', () => {
    it('update validates new category', async () => {
      const product = await service.create({
        name: 'Phone',
        price: 500,
        stock: 10,
        categoryId,
      });
      await expect(
        service.update(product._id.toString(), {
          categoryId: '507f1f77bcf86cd799439011',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes an existing product', async () => {
      const product = await service.create({
        name: 'Phone',
        price: 500,
        stock: 10,
        categoryId,
      });
      const id = product._id.toString();
      await service.remove(id);
      await expect(service.findOne(id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
