import { describe, expect, test } from 'bun:test';

import { invariant, noop } from '../../lib/utils';
import { initialiseGameBoard } from './engine.board';
import { GameCard } from './engine.game';
import { createHookActions } from './engine.hook.actions';

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
			action: {
				type: 'select_from_hand',
				config: {
					type: 'any',
					quantity: 1,
				},
				onAction: ({ cards }) => {
					selectedCards.push(...cards);
				},
			},
			timeoutMs: 1000,
			onTimeout: noop,
		});

		const cardsToSubmit = [createCard()];
		const expectAction = await iter.next();
		if (expectAction.done === false) {
			const action = expectAction.value.actions?.sideA;
			if (action?.type === 'select_from_hand') {
				action.submit({ cards: cardsToSubmit });
			}
		}
		await iter.next();
		expect(selectedCards).toEqual(cardsToSubmit);
	});
});
