import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
} from '../../test/mongo-test-setup';

describe('UsersService', () => {
  let service: UsersService;
  let connection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
    connection = module.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await closeInMongodConnection();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a user with defaults', async () => {
      const user = await service.create({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'pw',
      });
      expect(user._id).toBeDefined();
      expect(user.role).toBe('customer');
    });

    it('throws ConflictException on duplicate email', async () => {
      await service.create({ name: 'A', email: 'a@x.com', password: 'p' });
      await expect(
        service.create({ name: 'B', email: 'a@x.com', password: 'p' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('returns an existing user', async () => {
      const created = await service.create({
        name: 'A',
        email: 'a@x.com',
        password: 'p',
      });
      const found = await service.findOne(created._id.toString());
      expect(found.email).toBe('a@x.com');
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException for invalid id', async () => {
      await expect(service.findOne('not-an-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fields', async () => {
      const user = await service.create({
        name: 'A',
        email: 'a@x.com',
        password: 'p',
      });
      const updated = await service.update(user._id.toString(), {
        name: 'Alice',
      });
      expect(updated.name).toBe('Alice');
      expect(updated.email).toBe('a@x.com');
    });

    it('throws for unknown id', async () => {
      await expect(
        service.update('507f1f77bcf86cd799439011', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes an existing user', async () => {
      const user = await service.create({
        name: 'A',
        email: 'a@x.com',
        password: 'p',
      });
      const id = user._id.toString();
      const result = await service.remove(id);
      expect(result).toEqual({ deleted: true, id });
      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws for unknown id', async () => {
      await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll / findByEmail', () => {
    it('lists all users', async () => {
      await service.create({ name: 'A', email: 'a@x.com', password: 'p' });
      await service.create({ name: 'B', email: 'b@x.com', password: 'p' });
      const list = await service.findAll();
      expect(list).toHaveLength(2);
    });

    it('finds by email', async () => {
      await service.create({ name: 'A', email: 'a@x.com', password: 'p' });
      const found = await service.findByEmail('a@x.com');
      expect(found).not.toBeNull();
      const missing = await service.findByEmail('missing@x.com');
      expect(missing).toBeNull();
    });
  });
});
