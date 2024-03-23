import { invariant, noop } from '../../lib/utils';
import { topOf } from '../engine/engine.board';
import { DbCard, SIDES, STACKS, Side } from '../engine/engine.game';

export const deck: DbCard[] = [
	{
		id: '1',
		name: 'Frostfire Bolt',
		type: 'spell',
		attack: 20,
		colors: ['red', 'blue'],
		description: 'When this card is revealed, discard 1 card from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: { from: 'self', max: 1, min: 1, type: 'any' },
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
								side: ownerSide,
							});
						},
					},
					timeoutMs: 1000000,
					onTimeout: noop,
				});
			},
		},
	},
	{
		id: '2',
		name: 'Burning Branch',
		type: 'spell',
		attack: 20,
		colors: ['red', 'green'],
		description: 'When this card is revealed, discard 1 card from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: { from: 'self', max: 1, min: 1, type: 'any' },
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
								side: ownerSide,
							});
						},
					},
					timeoutMs: 1000000,
					onTimeout: noop,
				});
			},
		},
	},
	{
		id: '3',
		name: 'Solar Beam',
		type: 'spell',
		attack: 20,
		colors: ['blue', 'green'],
		description: 'When this card is revealed, discard 1 card from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: { from: 'self', max: 1, min: 1, type: 'any' },
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
								side: ownerSide,
							});
						},
					},
					timeoutMs: 1000000,
					onTimeout: noop,
				});
			},
		},
	},
	{ id: '4', name: 'Great Sword', type: 'spell', colors: [], attack: 12, description: '', effects: {} },
	{ id: '5', name: 'Sacred Water', type: 'spell', colors: ['blue'], attack: 10, heal: 5, description: '', effects: {} },
	{ id: '6', name: 'Sacred Water', type: 'spell', colors: ['blue'], attack: 10, heal: 5, description: '', effects: {} },
	{
		id: '7',
		type: 'field',
		name: 'Sacred Pool',
		description: 'If both players cast spells from the blue stack during combat, heals both wizards for 10 HP.',
		color: 'blue',
		effects: {
			afterCombat: async function* ({ game, turn }) {
				if (turn.spells.sideA?.slot === 'blue' && turn.spells.sideB?.slot === 'blue') {
					game.board.players.sideA.hp += 10;
					game.board.players.sideB.hp += 10;
					yield game;
				}
			},
		},
	},
	{
		id: '8',
		type: 'spell',
		name: 'Frost Burn',
		description: 'Whenever this spell deals damage, discard the top card from your opponents green stack.',
		colors: ['blue'],
		attack: 8,
		effects: {
			onDealDamage: async function* ({ actions, opponentSide, game }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.green);
				if (!cardToDiscard) return;
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.green,
					side: opponentSide,
				});
			},
		},
	},
	{
		id: '9',
		type: 'spell',
		name: 'Nature’s Wrath',
		description: 'Whenever this spell deals damage, discard the top card from your opponents red stack.',
		colors: ['green'],
		attack: 8,
		effects: {
			onDealDamage: async function* ({ actions, opponentSide, game }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.red);
				if (!cardToDiscard) return;
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.red,
					side: opponentSide,
				});
			},
		},
	},
	{
		id: '10',
		type: 'spell',
		name: 'Boiling Temperature',
		description: 'Whenever this spell deals damage, discard the top card from your opponents blue stack.',
		colors: ['red'],
		attack: 8,
		effects: {
			onDealDamage: async function* ({ actions, opponentSide, game }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.blue);
				if (!cardToDiscard) return;
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.blue,
					side: opponentSide,
				});
			},
		},
	},
	{
		id: '11',
		type: 'field',
		name: 'Void Space',
		description: 'Before combat, each player chooses one of their spell slots, and discards the top card from it.',
		color: null,
		effects: {
			beforeCombat: async function* ({ actions, game }) {
				const selectStackAndDiscard = (side: Side) => {
					const stacksWithCards = STACKS.filter(stack => game.board.players[side].stacks[stack].length > 0);
					if (stacksWithCards.length === 0) return;
					return actions.playerAction({
						action: {
							type: 'select_spell_stack',
							config: { min: 1, max: 1, from: 'self', availableStacks: stacksWithCards },
							onAction: function* ({ stacks }) {
								const stack = stacks[0];
								invariant(stack, 'Stack not found');
								const cardToDiscard = topOf(game.board.players.sideA.stacks[stack]);
								if (cardToDiscard) {
									yield* actions.discard({
										card: cardToDiscard,
										from: game.board.players.sideA.stacks[stack],
										side: 'sideA',
									});
								}
							},
						},
						sides: [side],
						timeoutMs: 100000,
						onTimeout: noop,
					});
				};
				const ownerDiscard = selectStackAndDiscard('sideA');
				if (ownerDiscard) yield* ownerDiscard;
				const opponentDiscard = selectStackAndDiscard('sideB');
				if (opponentDiscard) yield* opponentDiscard;
			},
		},
	},
	{
		id: '12',
		type: 'spell',
		name: 'Overgrown root',
		description: '4X attack, where X is the number of cards in this stack. (NOT IMPLEMENTED)',
		attack: 15,
		colors: ['green'],
		effects: {},
	},
	{
		id: '13',
		type: 'field',
		name: 'Unstable Ground',
		description: 'If both players attack with the same spell colour, both take 10 damage.',
		color: null,
		effects: {
			afterCombat: async function* ({ turn, actions }) {
				if (turn.spells.sideA?.slot === turn.spells.sideB?.slot) {
					yield* actions.damage({ side: 'sideA', amount: 10 });
					yield* actions.damage({ side: 'sideB', amount: 10 });
				}
			},
		},
	},
	{
		id: '14',
		type: 'spell',
		name: 'Giant Leech',
		description: 'When this spell deals damage, you may choose a card from your opponent’s hand and discard it.',
		attack: 6,
		colors: ['green'],
		effects: {
			onDealDamage: async function* ({ actions, game, opponentSide }) {
				if (game.board.players[opponentSide].hand.length === 0) return;
				yield* actions.playerAction({
					sides: [opponentSide],
					action: {
						type: 'select_from_hand',
						config: { from: 'opponent', max: 1, min: 1, type: 'any' },
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[opponentSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[opponentSide].hand,
								side: opponentSide,
							});
						},
					},
					timeoutMs: 10000,
					onTimeout: noop,
				});
			},
		},
	},
	{
		id: '15',
		type: 'spell',
		name: 'Sword-breaker',
		colors: ['red'],
		attack: 5,
		description: 'If this spell is beaten, discard the card that beat it. (NOT IMPLEMENTED)',
		effects: {},
	},
	{
		id: '16',
		type: 'field',
		name: 'Industrial scale',
		color: 'red',
		description: 'After combat, the player who has the least HP draws one card.',
		effects: {
			afterCombat: async function* ({ game, actions }) {
				const playerA = game.board.players.sideA;
				const playerB = game.board.players.sideB;
				if (playerA.hp === playerB.hp) return;
				const playerWithLeastHp = playerA.hp < playerB.hp ? playerA : playerB;
				yield* actions.draw({ side: playerWithLeastHp.side });
			},
		},
	},
	{
		id: '17',
		type: 'field',
		name: 'Spreading Fire',
		description: 'Whenever you attack with a red spell, draw 1 card',
		color: 'red',
		effects: {
			afterCombat: async function* ({ actions, turn }) {
				if (turn.spells.sideA?.slot === 'red') {
					yield* actions.draw({ side: 'sideA' });
				}
				if (turn.spells.sideB?.slot === 'red') {
					yield* actions.draw({ side: 'sideB' });
				}
			},
		},
	},
	{
		id: '18',
		type: 'field',
		name: 'Hailstorm',
		description: 'Whenever you attack with a blue spell, draw 1 card',
		color: 'blue',
		effects: {
			afterCombat: async function* ({ actions, turn }) {
				if (turn.spells.sideA?.slot === 'blue') {
					yield* actions.draw({ side: 'sideA' });
				}
				if (turn.spells.sideB?.slot === 'blue') {
					yield* actions.draw({ side: 'sideB' });
				}
			},
		},
	},
	{
		id: '19',
		type: 'field',
		name: 'Spike-riddled Rhizome',
		description: 'Whenever you attack with a green spell, draw 1 card',
		color: 'green',
		effects: {
			afterCombat: async function* ({ actions, turn }) {
				if (turn.spells.sideA?.slot === 'green') {
					yield* actions.draw({ side: 'sideA' });
				}
				if (turn.spells.sideB?.slot === 'green') {
					yield* actions.draw({ side: 'sideB' });
				}
			},
		},
	},
	{
		id: '20',
		type: 'spell',
		colors: ['red'],
		name: 'Tome of fire',
		description: 'Red field effects are triggered twice (NOT IMPLEMENTED)',
		attack: 12,
		effects: {},
	},
	{
		id: '21',
		type: 'spell',
		colors: ['blue'],
		name: 'Tome of ice',
		description: 'Blue field effects are triggered twice (NOT IMPLEMENTED)',
		attack: 12,
		effects: {},
	},
	{
		id: '22',
		type: 'spell',
		colors: ['green'],
		name: 'Tome of nature',
		description: 'Green field effects are triggered twice (NOT IMPLEMENTED)',
		attack: 12,
		effects: {},
	},
	{
		id: '23',
		name: 'Tall grass',
		type: 'field',
		color: 'green',
		description: 'Green spells deal 5 extra damage',
		effects: {
			beforeCombat: async function* ({ game, turn }) {
				for (const side of SIDES) {
					const ownerSpell = turn.spells[side];
					if (!ownerSpell) continue;
					if (ownerSpell.card?.colors.includes('green')) {
						turn.extraDamage[side] += 5;
					}
				}
				yield game;
			},
		},
	},
	{
		id: '24',
		name: 'Augmentation Device',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '5+X, where X is the attack of the card below this. (NOT IMPLEMENTED)',
		effects: {},
	},
];
