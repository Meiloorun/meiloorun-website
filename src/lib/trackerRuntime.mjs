import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped: never assign one request's credentials/storage to global state.
const runtime = new AsyncLocalStorage();
export const withTrackerRuntime = (context, task) => runtime.run(context, task);
export const trackerRuntime = () => runtime.getStore();
export const setting = name => runtime.getStore()?.env?.[name] || undefined;

// Loaders execute in the shared object, where their cache writes and token
// refreshes are coordinated. They run directly when already inside that object.
export async function sharedTracker(kind, args = []) {
  const context = trackerRuntime();
  if (context?.storage) return undefined;
  if (!context?.env?.TRACKER_CACHE) throw new Error('Tracker storage is not configured');
  const namespace = context.env.TRACKER_CACHE;
  const stub = namespace.get(namespace.idFromName('media-v1'));
  const response = await stub.fetch('https://tracker.internal/load', {
    method: 'POST', body: JSON.stringify({ kind, args }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Shared tracker unavailable');
  return { value: await response.json() };
}
