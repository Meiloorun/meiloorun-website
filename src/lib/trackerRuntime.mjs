import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped: never assign one request's credentials/storage to global state.
const runtime = new AsyncLocalStorage();
export const withTrackerRuntime = (context, task) => runtime.run(context, task);
export const trackerRuntime = () => runtime.getStore();
export const setting = name => runtime.getStore()?.env?.[name] || undefined;
