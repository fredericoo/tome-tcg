import { and, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Elysia, error, t } from 'elysia';

import { db } from '../../db';
import { games, users } from '../../db/schema';
import { takeFirst, takeFirstOrThrow } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { deck } from '../card/card.fns';
import { gamePubSub } from './game.pubsub';

export const gameRoutes = new Elysia({ prefix: '/games' })
	.use(withUser)
	.use(gamePubSub)
	.get('/:id', async ({ user, params }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view a game.');
		const gameIncludesUser = or(eq(games.sideA, user.id), eq(games.sideB, user.id));

		const sideA = alias(users, 'sideA');
		const sideB = alias(users, 'sideB');
		const game = await db
			.select({
				id: games.id,
				status: games.status,
				sideA: sideA,
				sideB: sideB,
			})
			.from(games)
			.where(and(eq(games.id, Number(params.id)), gameIncludesUser))
			.innerJoin(sideA, eq(games.sideA, sideA.id))
			.innerJoin(sideB, eq(games.sideB, sideB.id))
			.then(takeFirst);

		if (!game) return error('Not Found', 'Game not found');

		const cards = Object.fromEntries(deck.map(({ effects: _, ...card }) => [card.id, card]));
		return { game, cards };
	})
	.post(
		'/',
		async ({ user, body }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to create a game.');
			if (user.id === body.opponentId) return error('Bad Request', 'You cannot play against yourself');

			const { opponentId, ...configs } = body;
			const createdGame = await db
				.insert(games)
				.values({ sideA: user.id, sideB: opponentId, status: 'CREATED', ...configs })
				.returning()
				.then(takeFirstOrThrow);

			return createdGame;
		},
		{
			body: t.Composite([
				t.Object({
					opponentId: t.String(),
					castTimeoutMs: t.Numeric(),
					phaseDelayMs: t.Numeric(),
					startingCards: t.Numeric(),
					spellTimeoutMs: t.Numeric(),
				}),
			]),
		},
	);
