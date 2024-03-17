import { topOf } from './features/engine/engine.board';
import { DbCard, SIDES, STACKS, Side, SpellStack, createGameInstance } from './features/engine/engine.game';
import { invariant } from './lib/utils';

const deck: DbCard[] = [
	{
		id: '1',
		type: 'field',
		name: 'Sacred Pool',
		description: 'If both players cast spells from the blue stack during combat, heals both wizards for 10 HP.',
		color: 'blue',
		effects: {
			afterCombat: async function* ({ board, turn }) {
				if (turn.spells.sideA?.slot === 'blue' && turn.spells.sideB?.slot === 'blue') {
					board.players.sideA.hp += 10;
					board.players.sideB.hp += 10;
					yield { board };
				}
			},
		},
	},
	{
		id: '2',
		type: 'spell',
		name: 'Frost Burn',
		description: 'When you cast a spell from the blue stack, discard the top card from your opponents green stack.',
		colors: ['blue'],
		attack: 10,
		effects: {
			beforeCombat: async function* ({ actions, ownerSide, turn, board }) {
				if (turn.spells[ownerSide]?.slot === 'blue') {
					const opponentSide = ownerSide === 'sideA' ? 'sideB' : 'sideA';
					actions.moveTopCard(board.players[opponentSide].stacks.green, board.players[opponentSide].discardPile);
					yield { board };
				}
			},
		},
	},
	{
		id: '3',
		type: 'field',
		name: 'Void Space',
		description: 'Before combat, each player chooses one of their spell slots, and discards the top card from it',
		color: 'neutral',
		effects: {
			beforeCombat: async function* ({ actions, board }) {
				const discardFromStack = (stack: SpellStack, side: Side) => {
					const selectedStack = board.players[side].stacks[stack];
					const cardToDiscard = topOf(selectedStack);
					if (!cardToDiscard) return;
					actions.discard({ card: cardToDiscard, from: selectedStack, side });
				};

				for (const side of SIDES) {
					yield* actions.playerAction({
						action: {
							type: 'select_spell_stack',
							config: {},
							onAction: ({ stack }) => {
								discardFromStack(stack, side);
							},
						},
						side,
						timeoutMs: 10000,
						onTimeout: () => {
							const randomStack = STACKS[Math.floor(Math.random() * STACKS.length)];
							invariant(randomStack, 'randomStack is undefined');
							discardFromStack(randomStack, side);
						},
					});
				}
				yield { board };
			},
		},
	},
];

const play = async () => {
	const game = createGameInstance({
		decks: { sideA: [...deck], sideB: [...deck] },
		settings: { castTimeoutMs: Infinity, spellTimeoutMs: Infinity },
	});

	let turn = 0;
	console.log('Game started');
	for await (const iteration of game) {
		console.log(`Turn ${++turn}`);
		confirm('Proceed?');
		console.log(JSON.stringify(iteration, null, 2));
	}

	console.log('Game over');
};

play();
