import { defineConfig } from 'drizzle-kit';

/**
 * The warehouse's own schema and migrations, kept apart from `drizzle.config.ts`: those migrations
 * apply to the app's database on every deploy, while these are applied by hand to the warehouse
 * project. See `docs/data-warehousing.md`.
 */
export default defineConfig({
	dialect: 'postgresql',
	schema: './db/warehouse-schema.mts',
	out: 'db/warehouse-migrations',
});
