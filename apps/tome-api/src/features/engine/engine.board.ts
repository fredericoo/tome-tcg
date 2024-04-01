import { DbCard, FieldCard, GameCard, Side, SpellCard, SpellColor } from './engine.game';

export type Board = {
	phase: 'draw' | 'cast' | 'reveal' | 'spell' | 'combat' | 'damage';
	players: Record<
		Side,
		{
			side: Side;
			hp: number;
			stacks: Record<SpellColor, SpellCard[]>;
			hand: GameCard[];
			drawPile: GameCard[];
			casting: Partial<Record<SpellColor, SpellCard>> & { field?: FieldCard };
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

export const createGameBoard = ({ decks }: { decks: { sideA: DbCard[]; sideB: DbCard[] } }): Board => {
	let cardIndex = 0;
	const initialiseBoardSide = (deck: DbCard[], side: Side): Board['players'][Side] => {
		const boardSide = {
			side,
			hp: 100,
			hand: [],
			casting: {},
			drawPile: deck.map(card => ({ ...card, key: cardIndex++ })),
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
