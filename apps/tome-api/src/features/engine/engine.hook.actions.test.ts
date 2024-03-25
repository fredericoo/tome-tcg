import { describe, expect, test } from 'bun:test';

import { invariant, noop } from '../../lib/utils';
import { initialiseGameBoard } from './engine.board';
import { GameCard, initialiseGame } from './engine.game';
import { createHookActions } from './engine.hook.actions';

let cardId = 0;
const createCard = (name?: string): GameCard => {
	const key = cardId++;
	return {
		name: name ?? 'dummy card',
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
		const game = initialiseGame(initialiseGameBoard({ decks: { sideA: [createCard()], sideB: [] } }));

		const actions = createHookActions(game);

		const iter = actions.moveTopCard(game.board.players.sideA.drawPile, game.board.players.sideA.discardPile);

		const draw = iter.next();
		invariant(draw.done === false, 'Expected draw to not be done');
		const newBoard = draw.value.board;
		expect(newBoard.players.sideA.drawPile).toHaveLength(0);
		expect(newBoard.players.sideA.discardPile).toHaveLength(1);
	});

	test('can wait for player action to be taken', async () => {
		const cardDb = [createCard('Starting'), createCard('Hand')];

		const game = initialiseGame(initialiseGameBoard({ decks: { sideA: cardDb.slice(0, 1), sideB: [] } }));
		const selectedCards: GameCard[] = [];
		const actions = createHookActions(game);

		const iter = actions.playerAction({
			sides: ['sideA'],
			action: {
				type: 'select_from_hand',
				config: {
					type: 'any',
					min: 1,
					max: 1,
					from: 'self',
					message: '',
				},
				onAction: function* ({ cardKeys }) {
					const cards = cardKeys.map(key => cardDb.find(c => c.key === key)).filter(Boolean);
					selectedCards.push(...cards);
					yield game;
				},
			},
			timeoutMs: 1000,
			onTimeout: noop,
		});

		const cardsToSubmit = [cardDb[1]].filter(Boolean);
		const expectAction = await iter.next();
		if (expectAction.done === false) {
			const action = expectAction.value.actions.sideA;
			if (action?.type === 'select_from_hand') {
				const submit = action.submit({ cardKeys: cardsToSubmit.map(c => c.key), side: 'sideA' });
				for await (const _ of submit) void 0;
			}
		}
		await iter.next();
		expect(selectedCards).toEqual(cardsToSubmit);
	});
});
