import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category, CategorySchema } from './schemas/category.schema';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
} from '../../test/mongo-test-setup';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let connection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Category.name, schema: CategorySchema },
        ]),
      ],
      providers: [CategoriesService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    connection = module.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await connection.collection('categories').deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeInMongodConnection();
  });

  it('creates a category', async () => {
    const cat = await service.create({
      name: 'Electronics',
      description: 'E',
    });
    expect(cat._id).toBeDefined();
    expect(cat.name).toBe('Electronics');
  });

  it('rejects duplicate names (case-insensitive)', async () => {
    await service.create({ name: 'Books' });
    await expect(service.create({ name: 'books' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('findOne throws NotFound for missing id', async () => {
    await expect(
      service.findOne('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and removes', async () => {
    const cat = await service.create({ name: 'Books' });
    const id = cat._id.toString();
    const updated = await service.update(id, { description: 'Fiction' });
    expect(updated.description).toBe('Fiction');

    expect(await service.remove(id)).toEqual({ deleted: true, id });
    await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll lists all categories', async () => {
    await service.create({ name: 'A' });
    await service.create({ name: 'B' });
    expect(await service.findAll()).toHaveLength(2);
  });
});
