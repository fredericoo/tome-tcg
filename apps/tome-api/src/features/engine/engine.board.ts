import { invariant } from '../../lib/utils';
import { CardSlug, cardDb } from '../card/card.db';
import { FieldCard, GameCard, Side, SpellCard, SpellColor } from './engine.game';

export type Board = {
	phase: 'draw' | 'prepare' | 'reveal' | 'field-clash' | 'cast-spell' | 'spell-clash' | 'damage';
	players: Record<
		Side,
		{
			side: Side;
			hp: number;
			stacks: Record<SpellColor, SpellCard[]>;
			hand: GameCard[];
			drawPile: GameCard[];
			casting: Record<SpellColor, SpellCard[]> & { field: FieldCard[] };
		}
	>;
	field: FieldCard[];
	discardPile: GameCard[];
};

export const shuffle = (deck: GameCard[]) => {
	deck.sort(() => Math.random() - 0.5);
};

export const removeCard = (from: GameCard[], card: GameCard) => {
	const index = from.indexOf(card);
	if (index === -1) return;
	return from.splice(index, 1)[0];
};

export const moveTopCard = (from: GameCard[], to: GameCard[]) => {
	const card = from.pop();
	if (card) to.push(card);
	return { card };
};

export const moveBottomCard = (from: GameCard[], to: GameCard[]) => {
	const card = from.shift();
	if (card) to.push(card);
	return { card };
};

export const topOf = <T>(arr: T[]) => arr[arr.length - 1];

export const createGameBoard = ({ decks }: { decks: Record<Side, CardSlug[]> }): Board => {
	const cardKeys = Array.from({ length: decks.sideA.length + decks.sideB.length }, (_, i) => i + 1).sort(
		() => Math.random() - 0.5,
	);

	const initialiseBoardSide = (deck: CardSlug[], side: Side): Board['players'][Side] => {
		const boardSide: Board['players'][Side] = {
			side,
			hp: 100,
			hand: [],
			casting: { blue: [], field: [], green: [], red: [] },
			drawPile: deck.map(slug => {
				const key = cardKeys.pop();
				invariant(key, 'Ran out of card keys');
				return { ...cardDb[slug], id: slug, key };
			}),
			stacks: {
				blue: [],
				green: [],
				red: [],
			},
		};
		shuffle(boardSide.drawPile);
		return boardSide;
	};

	return {
		phase: 'draw',
		field: [],
		discardPile: [],
		players: {
			sideA: initialiseBoardSide(decks.sideA, 'sideA'),
			sideB: initialiseBoardSide(decks.sideB, 'sideB'),
		},
	};
};
