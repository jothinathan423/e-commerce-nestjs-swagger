import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { DynamicModule } from '@nestjs/common';

let mongod: MongoMemoryServer | undefined;

export const rootMongooseTestModule = (
  options: MongooseModuleOptions = {},
): DynamicModule =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongod = await MongoMemoryServer.create();
      return { uri: mongod.getUri(), ...options };
    },
  });

export const closeInMongodConnection = async () => {
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
};
