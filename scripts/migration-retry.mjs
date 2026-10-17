import { setTimeout as delay } from 'node:timers/promises';

const retryDelays = [2000, 4000, 8000, 16000, 30000];
const transientCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT',
  'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE', '57P01', '57P02', '57P03']);

function temporaryConnectionFailure(error) {
  // Drizzle wraps driver errors in `cause`; Node may aggregate connection failures.
  const pending = [error], seen = new Set();
  while (pending.length && seen.size < 32) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    const code = typeof current.code === 'string' ? current.code : '';
    if (transientCodes.has(code) || /^08[A-Z0-9]{3}$/.test(code)) return true;
    // pg's pool timeouts and dropped connections do not always include a code.
    if (!code && /^(Connection terminated (unexpectedly|due to connection timeout)|timeout exceeded when trying to connect)$/i.test(current.message || '')) return true;
    pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors.slice(0, 16));
  }
  return false;
}

export async function withMigrationRetries(operation, {
  reset = async () => {}, wait = delay, warn = console.warn,
} = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= retryDelays.length || !temporaryConnectionFailure(error)) throw error;
      // Discard broken pools before retrying; never log raw errors or connection URLs.
      await reset();
      const milliseconds = retryDelays[attempt];
      warn(`Database connection unavailable during migration (attempt ${attempt + 1}/6). Retrying in ${milliseconds / 1000}s.`);
      await wait(milliseconds);
    }
  }
}
