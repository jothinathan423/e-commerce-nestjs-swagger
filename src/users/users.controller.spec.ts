import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
} from '../../test/mongo-test-setup';

describe('UsersController', () => {
  let controller: UsersController;
  let connection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      controllers: [UsersController],
      providers: [UsersService],
    }).compile();

    controller = module.get<UsersController>(UsersController);
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
    expect(controller).toBeDefined();
  });

  it('create + findAll', async () => {
    await controller.create({ name: 'A', email: 'a@x.com', password: 'p' });
    const list = await controller.findAll();
    expect(list).toHaveLength(1);
  });

  it('update + findOne + remove round trip', async () => {
    const user = await controller.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
    });
    const id = user._id.toString();
    await controller.update(id, { name: 'Alice' });
    const found = await controller.findOne(id);
    expect(found.name).toBe('Alice');
    expect(await controller.remove(id)).toEqual({ deleted: true, id });
  });
});
