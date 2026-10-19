import { defineConfig } from 'drizzle-kit';

// Schema generation needs no database credentials or live connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
