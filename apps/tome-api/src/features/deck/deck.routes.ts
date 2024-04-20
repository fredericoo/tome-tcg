import { Value } from '@sinclair/typebox/value';
import { and, eq } from 'drizzle-orm';
import { Elysia, error, t } from 'elysia';

import { db } from '../../db';
import { decks } from '../../db/schema';
import { takeFirstOrThrow } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { DeckSchema, SafeDeckSchema, getValidCards } from './deck.schemas';

const safeParseCards = (raw: string) => {
	try {
		const parsed = JSON.parse(raw);
		return Value.Decode(SafeDeckSchema, parsed);
	} catch (e) {
		return [];
	}
};

export const deckRoutes = new Elysia()
	.use(withUser)
	.get('/me/decks', async ({ user }) => {
		if (!user) return error('Unauthorized', 'You must be logged in to view your decks.');
		const userDecks = await db.select().from(decks).where(eq(decks.userId, user.id));
		return userDecks.map(deck => ({ ...deck, cards: safeParseCards(deck.cards) }));
	})
	.get('/decks/:deckId', async ({ params }) => {
		const deck = await db.select().from(decks).where(eq(decks.id, +params.deckId)).then(takeFirstOrThrow);
		return { ...deck, cards: safeParseCards(deck.cards) };
	})
	.post(
		'/me/decks',
		async ({ body, user }) => {
			if (!user) return error('Unauthorized', 'You must be logged in to create a deck.');

			const { name, cards } = body;
			await db.insert(decks).values({
				userId: user.id,
				name,
				cards: JSON.stringify(cards),
			});
		},
		{
			body: t.Object({
				name: t.String(),
				cards: DeckSchema,
			}),
		},
	)
	.post(
		'decks/:deckId',
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
				cards: t.Optional(DeckSchema),
			}),
		},
	);
