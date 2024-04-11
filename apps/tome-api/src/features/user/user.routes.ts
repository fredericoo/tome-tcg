import { and, eq, like, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Elysia, error, t } from 'elysia';

import { db } from '../../db';
import { decks, games, users } from '../../db/schema';
import { withUser } from '../auth/auth.plugin';
import { CardSlug, cardDb } from '../card/card.db';

const getValidCards = (tentative: unknown[]) =>
	tentative
		.map(card => {
			if (typeof card !== 'string') return undefined;
			if (card in cardDb) return card as CardSlug;
			return undefined;
		})
		.filter(Boolean);

const safeParseCards = (raw: string) => {
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return getValidCards(parsed);
	} catch (e) {
		return [];
	}
};

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
			.where(and(gameIncludesUser, eq(games.status, 'CREATED')))
			.innerJoin(sideA, eq(games.sideA, sideA.id))
			.innerJoin(sideB, eq(games.sideB, sideB.id));
	})
	.get('/me/decks', async ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your decks.');
		const userDecks = await db.select().from(decks).where(eq(decks.userId, user.id));
		return userDecks.map(deck => ({ ...deck, cards: safeParseCards(deck.cards) }));
	})
	.post(
		'/me/decks',
		async ({ body, user }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to create a deck.');
			const { name, cards } = body;
			await db.insert(decks).values({
				userId: user.id,
				name,
				cards: JSON.stringify(getValidCards(cards)),
			});
		},
		{
			body: t.Object({
				name: t.String(),
				cards: t.Array(t.String()),
			}),
		},
	)
	.patch(
		'/me/decks/:deckId',
		async ({ body, user, params }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to update a deck.');
			const { name, cards } = body;
			await db
				.update(decks)
				.set({
					name,
					cards: cards ? JSON.stringify(getValidCards(cards)) : undefined,
				})
				.where(and(eq(decks.userId, user.id), eq(decks.id, Number(params.deckId))));
		},
		{
			body: t.Object({
				name: t.Optional(t.String()),
				cards: t.Optional(t.Array(t.String())),
			}),
		},
	);
