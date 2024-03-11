import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
	schema: './src/db/schema.ts',
	out: './drizzle',
	driver: 'libsql',
	dbCredentials: {
		url: 'file:dev.db',
	},
} satisfies Config;
