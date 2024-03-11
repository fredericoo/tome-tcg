import { describe, expect, test } from 'bun:test';

import { initialiseBoardSide } from './board-utils';
import { createHookActions } from './turn-actions';
import { AnyCard, Board } from './turn-manager';
import { invariant } from './utils';

let cardId = 0;
const createCard = (): AnyCard => ({
	name: 'dummy card',
	type: 'field',
	description: '',
	color: 'blue',
	effects: {},
	id: String(cardId++),
});

describe('turn actions', () => {
	test('can discard top card from deck', () => {
		const board: Board = {
			field: [],
			players: {
				sideA: initialiseBoardSide([createCard()]),
				sideB: initialiseBoardSide([]),
			},
		};

		const actions = createHookActions(board);

		const iter = actions.moveTopCard(board.players.sideA.drawPile, board.players.sideA.discardPile);

		const draw = iter.next();
		invariant(draw.done === false, 'Expected draw to not be done');
		const newBoard = draw.value.board;
		expect(newBoard.players.sideA.drawPile).toHaveLength(0);
		expect(newBoard.players.sideA.discardPile).toHaveLength(1);
	});

	test('can wait for player action to be taken', async () => {
		const board: Board = {
			field: [],
			players: {
				sideA: initialiseBoardSide([createCard()]),
				sideB: initialiseBoardSide([]),
			},
		};

		const selectedCards: AnyCard[] = [];
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
