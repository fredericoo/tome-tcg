import { and, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Elysia, error } from 'elysia';

import { db } from '../../db';
import { games, users } from '../../db/schema';
import { withUser } from '../auth/auth.plugin';

export const userRoutes = new Elysia()
	.use(withUser)
	.get('/me', ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your games.');
		return user;
	})
	.get('/me/games', async ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your games.');
		const gameIncludesUser = or(eq(games.sideA, user.id), eq(games.sideB, user.id));

		const sideA = alias(users, 'sideA');
		const sideB = alias(users, 'sideB');
		return await db
			.select({
				id: games.id,
				status: games.status,
				sideA: sideA.username,
				sideB: sideB.username,
			})
			.from(games)
			.where(and(gameIncludesUser, eq(games.status, 'CREATED')))
			.leftJoin(sideA, eq(games.sideA, sideA.id))
			.leftJoin(sideB, eq(games.sideB, sideB.id));
	});
