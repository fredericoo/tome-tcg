import { Config, createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { P, match } from 'ts-pattern';

import * as schema from './schema';

const dbConfig = match(process.env)
	.with(
		{ DATABASE_URL: P.string.minLength(1), DATABASE_AUTH_TOKEN: P.string.minLength(1) },
		({ DATABASE_AUTH_TOKEN, DATABASE_URL }): Config => ({
			url: DATABASE_URL,
			authToken: DATABASE_AUTH_TOKEN,
		}),
	)
	.with({ DATABASE_URL: P.string.minLength(1) }, ({ DATABASE_URL }): Config => ({ url: DATABASE_URL }))
	.otherwise(() => {
		throw new Error('No database credentials provided.');
	});

const client = createClient(dbConfig);
export const db = drizzle(client, { schema, logger: true });

export type Database = typeof db;
