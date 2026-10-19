// CLI helpers load .env privately. Explicit environment settings take precedence.
export function databaseUrl() {
  try { process.loadEnvFile('.env'); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not load database environment settings'); }
  return process.env.DATABASE_URL?.trim();
}
