import { invariant, noop } from '../../lib/utils';
import { topOf } from '../engine/engine.board';
import { DbCard, STACKS, Side, SpellStack } from '../engine/engine.game';

export const deck: DbCard[] = [
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
		colors: ['blue', 'red'],
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
				yield* actions.playerAction({
					sides: ['sideA', 'sideB'],
					action: {
						type: 'select_spell_stack',
						config: {},
						onAction: ({ stack, side }) => {
							discardFromStack(stack, side);
						},
					},
					timeoutMs: 10000,
					onTimeout: ({ side }) => {
						const randomStack = STACKS[Math.floor(Math.random() * STACKS.length)];
						invariant(randomStack, 'randomStack is undefined');
						discardFromStack(randomStack, side);
					},
				});
				yield { board };
			},
		},
	},
];

const randomColor = (): SpellStack => (['red', 'green', 'blue'] as const)[Math.floor(Math.random() * 3)]!;
deck.push(
	...Array.from({ length: 30 - deck.length }).map(
		(_, i): DbCard => ({
			id: (10 + i).toString(),
			type: 'spell',
			attack: Math.ceil(Math.random() * 20),
			colors: [randomColor(), randomColor()],
			description: 'Before the spell phase, choose a card from your opponent’s hand to be discarded',
			effects: {
				beforeSpell: async function* ({ game, actions, ownerSide }) {
					yield* actions.playerAction({
						sides: [ownerSide],
						action: {
							type: 'select_from_hand',
							config: { from: 'opponent', max: 1, min: 1, type: 'any' },
							onAction: function* ({ cardKeys, side }) {
								const cardToDiscard = game.board.players[side].hand.find(card => cardKeys.includes(card.key));
								if (!cardToDiscard) return;
								yield* actions.discard({ card: cardToDiscard, from: game.board.players[side].hand, side });
							},
						},
						timeoutMs: 10000,
						onTimeout: noop,
					});
				},
			},
			name: `Random Spell ${i}`,
		}),
	),
);
