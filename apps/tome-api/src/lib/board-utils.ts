import { AnyCard, Board, Side } from './turn-manager';

export const shuffle = (deck: AnyCard[]) => {
	deck.sort(() => Math.random() - 0.5);
};

export const moveTopCard = (from: AnyCard[], to: AnyCard[]) => {
	const card = from.pop();
	if (card) to.push(card);
	return { card };
};

export const moveBottomCard = (from: AnyCard[], to: AnyCard[]) => {
	const card = from.shift();
	if (card) to.push(card);
	return { card };
};

export const initialiseBoardSide = (deck: AnyCard[]): Board['players'][Side] => ({
	hp: 100,
	hand: [],
	discardPile: [],
	drawPile: deck,
	stacks: {
		blue: [],
		green: [],
		red: [],
	},
});
