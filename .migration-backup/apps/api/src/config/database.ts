import mongoose from 'mongoose';
import { config } from './index';

const globalForMongoose = globalThis as unknown as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

export async function connectDatabase(): Promise<typeof mongoose> {
  if (globalForMongoose.conn) {
    return globalForMongoose.conn;
  }

  if (!globalForMongoose.promise) {
    globalForMongoose.promise = mongoose.connect(config.mongodbUri, {
      maxPoolSize: 10,
    });
  }

  globalForMongoose.conn = await globalForMongoose.promise;
  return globalForMongoose.conn;
}

export { mongoose };
