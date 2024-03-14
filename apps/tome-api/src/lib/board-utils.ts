import { Board, DbCard, GameCard, Side } from './game-engine';

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

export const initialiseGameBoard = ({ decks }: { decks: { sideA: DbCard[]; sideB: DbCard[] } }): Board => {
	let cardIndex = 0;
	const initialiseBoardSide = (deck: DbCard[], side: Side): Board['players'][Side] => {
		const boardSide = {
			side,
			hp: 100,
			hand: [],
			discardPile: [],
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
		field: [],
		players: {
			sideA: initialiseBoardSide(decks.sideA, 'sideA'),
			sideB: initialiseBoardSide(decks.sideB, 'sideB'),
		},
	};
};
