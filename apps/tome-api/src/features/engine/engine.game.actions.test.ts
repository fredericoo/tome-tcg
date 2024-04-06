import { describe, expect, test } from 'bun:test';

import { invariant, noop } from '../../lib/utils';
import { createGameBoard } from './engine.board';
import { CARD_TYPES, COLORS, initialiseGame } from './engine.game';
import { useGameActions } from './engine.game.actions';

describe('game actions', () => {
	test('can discard top card from deck', () => {
		const game = initialiseGame(createGameBoard({ decks: { sideA: ['agonising-blast'], sideB: [] } }));

		const actions = useGameActions(game);

		const iter = actions.moveTopCard(game.board.players.sideA.drawPile, game.board.discardPile);

		const draw = iter.next();
		invariant(draw.done === false, 'Expected draw to not be done');
		const newBoard = draw.value.board;
		expect(newBoard.players.sideA.drawPile).toHaveLength(0);
		expect(newBoard.discardPile).toHaveLength(1);
	});

	test('can wait for player action to be taken', async () => {
		const game = initialiseGame(createGameBoard({ decks: { sideA: ['agonising-blast'], sideB: [] } }));
		const selectedCards: number[] = [];
		const actions = useGameActions(game);

		for await (const _ of actions.draw({ sides: ['sideA'] })) void 0;
		const iter = actions.playerAction({
			sides: ['sideA'],
			action: {
				type: 'select_from_hand',
				config: {
					availableTypes: CARD_TYPES,
					availableColors: COLORS,
					min: 1,
					max: 1,
					from: 'self',
					message: '',
				},
				onAction: function* ({ cardKeys }) {
					selectedCards.push(...cardKeys);
					yield game;
				},
			},
			timeoutMs: 1000,
			onTimeout: noop,
		});

		const firstCardInHand = game.board.players.sideA.hand[0];
		expect(firstCardInHand).toBeDefined();
		invariant(firstCardInHand, 'Expected first card to be defined');

		const expectAction = await iter.next();
		if (expectAction.done === false) {
			const action = expectAction.value.actions.sideA;
			if (action?.type === 'select_from_hand') {
				const submit = action.submit({ cardKeys: [firstCardInHand.key], side: 'sideA' });
				for await (const _ of submit) void 0;
			}
		}
		await iter.next();
		expect(selectedCards).toEqual([firstCardInHand.key]);
	});
});
