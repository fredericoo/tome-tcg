import { expect, mock, test } from 'bun:test';

import { initialiseGameBoard } from './board';
import { SIDES, STACKS, Side, SpellStack, initialiseTurn } from './game-engine';
import { createTriggerHooks } from './hooks';
import { createHookActions } from './hooks-actions';

test('trigger all effects of fields and spells from both sides', async () => {
	const effect = mock((ownerSide: undefined | [Side, SpellStack]) => ownerSide);

	const board = initialiseGameBoard({ decks: { sideA: [], sideB: [] } });
	board.field.push({
		name: 'Field',
		key: 1,
		type: 'field',
		description: '',
		color: 'blue',
		effects: {
			beforeCast: async function* () {
				effect(undefined);
				yield { board };
			},
		},
		id: '',
	});

	SIDES.map(side =>
		STACKS.map(stack => {
			board.players[side].stacks[stack].push({
				name: 'Spell',
				key: 1,
				type: 'spell',
				attack: 1,
				description: '',
				colors: [stack],
				effects: {
					beforeCast: async function* ({ ownerSide }) {
						effect([ownerSide, stack]);
						yield { board };
					},
				},
				id: '',
			});
		}),
	);

	const actions = createHookActions(board);
	const triggerHooks = createTriggerHooks(board);
	const turn = initialiseTurn({ finishedTurns: [] });

	const hooks = triggerHooks({ hookName: 'beforeCast', context: { board, actions, turn } });
	// wait until the generator is done
	for await (const _ of hooks) void 0;

	expect(effect).toHaveBeenNthCalledWith(1, undefined);
	expect(effect).toHaveBeenNthCalledWith(2, ['sideA', 'red']);
	expect(effect).toHaveBeenNthCalledWith(3, ['sideB', 'red']);
	expect(effect).toHaveBeenNthCalledWith(4, ['sideA', 'green']);
	expect(effect).toHaveBeenNthCalledWith(5, ['sideB', 'green']);
	expect(effect).toHaveBeenNthCalledWith(6, ['sideA', 'blue']);
	expect(effect).toHaveBeenNthCalledWith(7, ['sideB', 'blue']);
});
