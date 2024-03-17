import { and, eq, or } from 'drizzle-orm';
import { Elysia, error, t } from 'elysia';

import { db } from '../../db';
import { games } from '../../db/schema';
import { takeFirst, takeFirstOrThrow } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { gamePubSub } from './game.pubsub';

export const gameRoutes = new Elysia({ prefix: '/games' })
	.use(withUser)
	.use(gamePubSub)
	.get('/:id', async ({ user, params }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view a game.');
		const gameIncludesUser = or(eq(games.sideA, user.id), eq(games.sideB, user.id));
		const game = await db
			.select()
			.from(games)
			.where(and(eq(games.id, Number(params.id)), gameIncludesUser))
			.then(takeFirst);
		if (!game) return error('Not Found', 'Game not found');
		return game;
	})
	.post(
		'/',
		async ({ user, body }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to create a game.');

			const createdGame = await db
				.insert(games)
				.values({ sideA: user.id, sideB: body.opponentId, status: 'CREATED' })
				.returning()
				.then(takeFirstOrThrow);

			return createdGame;
		},
		{
			body: t.Object({ opponentId: t.String() }),
		},
	);
