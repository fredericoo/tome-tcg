import { and, eq, like, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Elysia, error, t } from 'elysia';

import { db } from '../../db';
import { games, users } from '../../db/schema';
import { withUser } from '../auth/auth.plugin';

export const userRoutes = new Elysia()
	.use(withUser)
	.get('/me', ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your games.');
		return user;
	})
	.get(
		'/users',
		async ({ query, user }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to view users.');
			return await db
				.select()
				.from(users)
				.where(like(users.username, `%${query.q}%`));
		},
		{ query: t.Object({ q: t.Optional(t.String()) }) },
	)
	.get('/me/games', async ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your games.');
		const gameIncludesUser = or(eq(games.sideA, user.id), eq(games.sideB, user.id));

		const sideA = alias(users, 'sideA');
		const sideB = alias(users, 'sideB');
		return await db
			.select({
				id: games.id,
				status: games.status,
				sideA: sideA,
				sideB: sideB,
			})
			.from(games)
			.where(and(gameIncludesUser))
			.innerJoin(sideA, eq(games.sideA, sideA.id))
			.innerJoin(sideB, eq(games.sideB, sideB.id));
	});
