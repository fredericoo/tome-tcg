import { TypeBoxError } from '@sinclair/typebox';
import { t } from 'elysia';

import { CardSlug, cardDb } from '../card/card.db';

export const getValidCards = (tentative: string[]) =>
	tentative
		.map(card => {
			if (card in cardDb) return card as CardSlug;
			return undefined;
		})
		.filter(Boolean);

const getValidCardsOrThrow = (tentative: string[]) =>
	tentative.map(card => {
		if (card in cardDb) return card as CardSlug;
		throw new TypeBoxError(`Card ${card} doesn't exist in the database`);
	});

const assertAllowedRepeats = (cards: CardSlug[], maxRepeated = 2) => {
	const seen = Array(maxRepeated)
		.fill(0)
		.map(() => new Set<CardSlug>());

	card_checks: for (const card of cards) {
		for (let i = 0; i < maxRepeated; i++) {
			const set = seen[i];
			if (!set) break;
			if (!set.has(card)) {
				set.add(card);
				continue card_checks;
			}
		}
		throw new TypeBoxError(`You can only have ${maxRepeated} of the same card in a deck. ${card} is repeated.`);
	}
};

export const DeckSchema = t
	.Transform(t.Array(t.String(), { maxItems: 30, minItems: 30 }))
	.Decode(a => {
		const cards = getValidCardsOrThrow(a);
		assertAllowedRepeats(cards);
		return cards;
	})
	.Encode(a => a.map(c => c.toString()));

/** Deck schema but only removes invalid cards, and does not check for repeated cards */
export const SafeDeckSchema = t
	.Transform(t.Array(t.String(), { maxItems: 30, minItems: 30 }))
	.Decode(getValidCards)
	.Encode(a => a.map(c => c.toString()));
