import { withTrackerRuntime } from './trackerRuntime.mjs';

export async function withNodeTrackerRuntime(env, task) {
  if (!env.DATABASE_URL?.trim()) throw Object.assign(new Error('DATABASE_URL is required'), { code: 'database' });
  const storage = (await import('../db/client.ts')).databaseConnection(env.DATABASE_URL.trim()).storage;
  return withTrackerRuntime({ env, node: true, storage }, task);
}
