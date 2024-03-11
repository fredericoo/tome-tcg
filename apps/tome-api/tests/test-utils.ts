import { edenFetch } from '@elysiajs/eden';
import { createClient } from '@libsql/client';
import { afterAll, afterEach, beforeAll, describe } from 'bun:test';
import { sql } from 'drizzle-orm';
import { LibSQLDatabase, drizzle } from 'drizzle-orm/libsql';
import { Elysia } from 'elysia';
import { unlink } from 'node:fs/promises';
import path from 'path';

import * as schema from '../src/db/schema';
import { setChmod } from '../src/lib/file';

const BASE_DATABASE_PATH = path.join(process.cwd(), `./tests/base.db`);

let testInstance = 0;
export const withTestDb = (description: string, testRunner: (db: LibSQLDatabase<typeof schema>) => void) => {
	testInstance += 1;
	const databaseFile = `./tests/test.${testInstance}.db`;
	const databasePath = path.join(process.cwd(), databaseFile);

	const client = createClient({ url: `file:${databasePath}` });
	const testDb = drizzle(client, { schema });

	beforeAll(async () => {
		const file = Bun.file(BASE_DATABASE_PATH);

		/** Copies the base file */
		await Bun.write(databasePath, file);
		await setChmod(databasePath, 0o777);
	});

	afterEach(async () => {
		const protectedTableNames = ['__drizzle_migrations', 'sqlite_sequence'];
		const tables = (await testDb.run(sql`SELECT name FROM sqlite_master WHERE type='table'`).execute()).rows
			.map(row => row.name)
			.filter(Boolean)
			.map(name => name.toString())
			.filter(name => !protectedTableNames.includes(name));

		for (const table of tables) {
			await testDb.run(sql.raw(`DELETE FROM "${table}"`)).execute();
		}
	});

	afterAll(async () => {
		/** Deletes the file created */
		await unlink(databasePath);
	});

	return describe(description, () => testRunner(testDb));
};

/** Poor man’s faker. Faker is a heavy module and tests dont need to be realistic. */
export const random = {
	string: () => Math.random().toString(36).substring(7),
	number: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
	boolean: () => Math.random() < 0.5,
	fromArray: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
};

let testPort = 6666;
export const createTestHandler = <T extends Elysia<any, any, any, any, any, any, any>>(app: T) => {
	// instead of adding one, we probably should use the test worker ID or something.
	testPort += 1;
	const controller = app.listen(testPort);
	afterAll(controller.stop);
	return edenFetch<typeof controller>(`http://localhost:${testPort}`);
};
