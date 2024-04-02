import { expect, mock, test } from 'bun:test';

import { createGameBoard } from './engine.board';
import { COLORS, SIDES, Side, SpellColor, initialiseGame } from './engine.game';
import { useGameActions } from './engine.hook.actions';
import { useTriggerHooks } from './engine.hooks';

test('trigger all effects of fields and spells from both sides', async () => {
	const effect = mock((ownerSide: undefined | [Side, SpellColor]) => ownerSide);

	const game = initialiseGame(createGameBoard({ decks: { sideA: [], sideB: [] } }));
	game.board.field.push({
		name: 'Field',
		key: 1,
		type: 'field',
		description: '',
		color: 'blue',
		effects: {
			beforeCast: async function* ({ game }) {
				effect(undefined);
				yield game;
			},
		},
		id: '',
	});

	SIDES.map(side =>
		COLORS.map(stack => {
			game.board.players[side].stacks[stack].push({
				name: 'Spell',
				key: 1,
				type: 'spell',
				attack: 1,
				description: '',
				colors: [stack],
				effects: {
					beforeCast: async function* ({ ownerSide, game }) {
						effect([ownerSide, stack]);
						yield game;
					},
				},
				id: '',
			});
		}),
	);

	const actions = useGameActions(game);
	const { triggerTurnHook } = useTriggerHooks(game);

	const hooks = triggerTurnHook({ hookName: 'beforeCast', context: { game, actions } });
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
