import { withTrackerRuntime } from './trackerRuntime.mjs';
import { databaseConnection } from '../db/client.ts';

export async function withNodeTrackerRuntime(env, task) {
  if (!env.DATABASE_URL?.trim()) throw Object.assign(new Error('DATABASE_URL is required'), { code: 'database' });
  const storage = databaseConnection(env.DATABASE_URL.trim()).storage;
  return withTrackerRuntime({ env, storage }, task);
}
