import { TypeBoxError } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { expect, test } from 'bun:test';

import { invariant } from '../../lib/utils';
import { cardDb } from '../card/card.db';
import { DeckSchema } from './deck.schemas';

const cardKeys = Object.keys(cardDb);

test('accepts exactly 30 cards', () => {
	const deck = cardKeys.slice(0, 30);
	const res = Value.Decode(DeckSchema, deck);
	expect(res.length).toBe(deck.length);
});

test('errors if over 30 cards', () => {
	const deck = cardKeys.slice(0, 31);
	try {
		const res = Value.Decode(DeckSchema, deck);
		expect(res).toBeInstanceOf(TypeBoxError);
	} catch (e) {
		expect(e).toBeInstanceOf(TypeBoxError);
	}
});

test('errors if under 30 cards', () => {
	const deck = cardKeys.slice(0, 29);
	try {
		const res = Value.Decode(DeckSchema, deck);
		expect(res).toBeInstanceOf(TypeBoxError);
	} catch (e) {
		expect(e).toBeInstanceOf(TypeBoxError);
		invariant(e instanceof TypeBoxError, 'Expected TypeBoxError');
		expect(e.message).toBe('Unable to decode due to invalid value');
	}
});

test('errors if not all cards exist on db', () => {
	const deck = cardKeys.slice(0, 29);
	deck.push('non-existing-card');
	try {
		const res = Value.Decode(DeckSchema, deck);
		expect(res).toBeInstanceOf(TypeBoxError);
	} catch (e) {
		expect(e).toBeInstanceOf(TypeBoxError);
		invariant(e instanceof TypeBoxError, 'Expected TypeBoxError');
		expect(e.message).toBe("Card doesn't exist in the database");
	}
});

test('allows for one repeated card', () => {
	const deck = cardKeys.slice(0, 29);
	const repeatedCard = cardKeys[0]!;
	deck.push(repeatedCard);

	const res = Value.Decode(DeckSchema, deck);
	expect(res.length).toBe(deck.length);
});

test('errors if more than two of the same card are present', () => {
	const deck = cardKeys.slice(0, 28);
	const repeatedCard = cardKeys[0]!;
	deck.push(repeatedCard);
	deck.push(repeatedCard);

	try {
		const res = Value.Decode(DeckSchema, deck);
		expect(res).toBeInstanceOf(TypeBoxError);
	} catch (e) {
		expect(e).toBeInstanceOf(TypeBoxError);
		invariant(e instanceof TypeBoxError, 'Expected TypeBoxError');
		expect(e.message).toBe(`You can only have 2 of the same card in a deck. ${repeatedCard} is repeated.`);
	}
});
