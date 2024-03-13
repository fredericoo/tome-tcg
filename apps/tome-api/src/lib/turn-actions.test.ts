import { describe, expect, test } from 'bun:test';

import { initialiseGameBoard } from './board-utils';
import { GameCard } from './game-engine';
import { createHookActions } from './turn-actions';
import { invariant } from './utils';

let cardId = 0;
const createCard = (): GameCard => {
	const key = cardId++;
	return {
		name: 'dummy card',
		key,
		type: 'field',
		description: '',
		color: 'blue',
		effects: {},
		id: String(key),
	};
};

describe('hook actions', () => {
	test('can discard top card from deck', () => {
		const board = initialiseGameBoard({ decks: { sideA: [createCard()], sideB: [] } });

		const actions = createHookActions(board);

		const iter = actions.moveTopCard(board.players.sideA.drawPile, board.players.sideA.discardPile);

		const draw = iter.next();
		invariant(draw.done === false, 'Expected draw to not be done');
		const newBoard = draw.value.board;
		expect(newBoard.players.sideA.drawPile).toHaveLength(0);
		expect(newBoard.players.sideA.discardPile).toHaveLength(1);
	});

	test('can wait for player action to be taken', async () => {
		const board = initialiseGameBoard({ decks: { sideA: [createCard()], sideB: [] } });

		const selectedCards: GameCard[] = [];
		const actions = createHookActions(board);

		const iter = actions.playerAction({
			side: 'sideA',
			type: 'select_from_hand',
			config: {
				type: 'any',
				quantity: 1,
				onActionTaken: ({ cards }) => {
					selectedCards.push(...cards);
				},
			},
			timeoutMs: 1000,
		});

		const cardsToSubmit = [createCard()];
		const expectAction = await iter.next();
		if (expectAction.done === false) {
			invariant('action' in expectAction.value && expectAction.value.action, 'Expected action to have an action key');
			expectAction.value.action.submit({ cards: cardsToSubmit });
		}
		await iter.next();
		expect(selectedCards).toEqual(cardsToSubmit);
	});
});
