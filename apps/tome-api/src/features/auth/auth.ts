import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { InferSelectModel } from 'drizzle-orm';
import { Lucia } from 'lucia';

import { db } from '../../db';
import { sessions, users } from '../../db/schema';

const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: process.env.NODE_ENV === 'production',
		},
	},
	getUserAttributes: attributes => {
		return {
			githubId: attributes.githubId,
			username: attributes.username,
		};
	},
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes extends InferSelectModel<typeof users> {}
