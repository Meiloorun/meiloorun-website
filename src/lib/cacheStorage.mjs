import { trackerRuntime } from './trackerRuntime.mjs';

function storage() {
  const value = trackerRuntime()?.storage;
  if (!value) throw Object.assign(new Error('Database storage is not configured'), { code: 'database' });
  return value;
}
export const readCache = key => storage().get(key);
export const writeCache = (key, value) => storage().put(key, value);
