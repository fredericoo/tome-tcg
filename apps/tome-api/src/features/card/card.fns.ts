import { invariant, noop } from '../../lib/utils';
import { topOf } from '../engine/engine.board';
import { DbCard, SIDES, STACKS, Side, resolveSpellClash } from '../engine/engine.game';
import { ACTIVATABLE_HOOKS } from '../engine/engine.hooks';
import { removeIfUsedInCombat } from './card.fns.utils';

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
						config: { from: 'self', max: 1, min: 1, type: 'any', message: 'Discard a card from your hand' },
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
						config: { from: 'self', max: 1, min: 1, type: 'any', message: 'Discard a card from your hand' },
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
						config: { from: 'self', max: 1, min: 1, type: 'any', message: 'Discard a card from your hand' },
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
	{
		id: '7',
		type: 'field',
		name: 'Sacred Pool',
		description: 'If both players cast spells from the blue stack during combat, heals both wizards for 10 HP.',
		color: 'blue',
		effects: {
			afterCombat: async function* ({ game, turn }) {
				if (turn.spells?.sideA?.slot === 'blue' && turn.spells.sideB?.slot === 'blue') {
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
							config: {
								min: 1,
								max: 1,
								from: 'self',
								availableStacks: stacksWithCards,
								message: 'Discard the top from a stack',
							},
							onAction: function* ({ stacks }) {
								const stack = stacks[0];
								invariant(stack, 'Stack not found');
								const cardToDiscard = topOf(game.board.players[side].stacks[stack]);
								if (cardToDiscard) {
									yield* actions.discard({
										card: cardToDiscard,
										from: game.board.players[side].stacks[stack],
										side: side,
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
		id: '13',
		type: 'field',
		name: 'Unstable Ground',
		description: 'If both players attack with the same spell stack, both take 10 damage.',
		color: null,
		effects: {
			afterCombat: async function* ({ turn, actions }) {
				if (turn.spells?.sideA?.slot === turn.spells?.sideB?.slot) {
					yield* actions.damagePlayer({ side: 'sideA', amount: 10 });
					yield* actions.damagePlayer({ side: 'sideB', amount: 10 });
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
			onDealDamage: async function* ({ actions, game, opponentSide, ownerSide }) {
				if (game.board.players[opponentSide].hand.length === 0) return;
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: { from: 'opponent', max: 1, min: 1, type: 'any', message: 'Discard from opponent’s hand' },
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
				yield* actions.draw({ sides: [playerWithLeastHp.side] });
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
				const drawingSides: Side[] = [];
				if (turn.spells?.sideA?.slot === 'red') drawingSides.push('sideA');
				if (turn.spells?.sideB?.slot === 'red') drawingSides.push('sideB');
				yield* actions.draw({ sides: drawingSides });
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
				const drawingSides: Side[] = [];
				if (turn.spells?.sideA?.slot === 'blue') drawingSides.push('sideA');
				if (turn.spells?.sideB?.slot === 'blue') drawingSides.push('sideB');
				yield* actions.draw({ sides: drawingSides });
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
				const drawingSides: Side[] = [];
				if (turn.spells?.sideA?.slot === 'green') drawingSides.push('sideA');
				if (turn.spells?.sideB?.slot === 'green') drawingSides.push('sideB');
				yield* actions.draw({ sides: drawingSides });
			},
		},
	},

	{
		id: '23',
		name: 'Tall grass',
		type: 'field',
		color: 'green',
		description: 'Green spells deal 5 extra damage',
		effects: {
			beforeCombat: async function* ({ turn, actions }) {
				for (const side of SIDES) {
					const ownerSpell = turn.spells?.[side];
					if (ownerSpell?.card?.colors.includes('green')) {
						yield* actions.addTurnExtraDamage({ side, amount: 5, turn });
					}
				}
			},
		},
	},

	{
		id: '25',
		name: 'Meteor shower',
		type: 'field',
		color: 'red',
		description:
			'Can only be cast on top of a GREEN field spell (NOT IMPLEMENTED). Before the next casting phase, discard the top card from both player’s green stacks, then discard this card.',
		effects: {
			beforeCast: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					const cardToDiscard = topOf(game.board.players[side].stacks.green);
					if (cardToDiscard) {
						yield* actions.discard({
							card: cardToDiscard,
							from: game.board.players[side].stacks.green,
							side,
						});
					}
				}
				yield* actions.discard({ card: thisCard, from: game.board.field, side: 'sideA' });
			},
		},
	},
	{
		id: '26',
		name: 'Syphon Earth',
		type: 'spell',
		colors: ['red'],
		attack: 7,
		description: 'When this spell deals damage, activate the effect of your top GREEN card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, turn, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.green);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, turn, thisCard });
				}
			},
		},
	},
	{
		id: '27',
		name: 'Syphon Water',
		type: 'spell',
		colors: ['green'],
		attack: 7,
		description: 'When this spell deals damage, activate the effect of your top BLUE card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, turn, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.blue);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, turn, thisCard });
				}
			},
		},
	},
	{
		id: '28',
		name: 'Syphon Fire',
		type: 'spell',
		colors: ['blue'],
		attack: 7,
		description: 'When this spell deals damage, activate the effect of your top RED card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, turn, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.red);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, turn, thisCard });
				}
			},
		},
	},
	{
		id: '29',
		name: 'Wooden staff of healing',
		type: 'spell',
		colors: ['green'],
		attack: 5,
		heal: 8,
		description: 'When this spell is beaten, discard it.',
		effects: {
			afterCombat: async function* ({ actions, game, thisCard, turn, opponentSide }) {
				if (!turn.spells) return;
				const { won } = resolveSpellClash(turn.spells);
				const isBeaten = won === opponentSide;
				if (isBeaten) yield* actions.discard({ card: thisCard, from: game.board.field, side: 'sideA' });
			},
		},
	},
	{
		id: '30',
		name: 'Stomp',
		type: 'spell',
		attack: 11,
		description: 'Whenever this spell deals damage, remove the top field effect from play.',
		colors: ['green'],
		effects: {
			onDealDamage: async function* ({ actions, game }) {
				const fieldEffect = topOf(game.board.field);
				if (!fieldEffect) return;
				yield* actions.discard({ card: fieldEffect, from: game.board.field, side: 'sideA' });
			},
		},
	},

	{
		id: '34',
		name: 'Ice Tendrill',
		type: 'spell',
		colors: ['green', 'blue'],
		description:
			'When this spell is placed in the GREEN stack, your spells will deal +10 damage this turn. When this spell is placed in the BLUE stack, draw a card',
		attack: 8,
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, turn, thisCard }) {
				if (topOf(game.board.players[ownerSide].stacks.green) === thisCard) {
					yield* actions.addTurnExtraDamage({ side: ownerSide, amount: 10, turn });
				}
				if (topOf(game.board.players[ownerSide].stacks.blue) === thisCard) {
					yield* actions.draw({ sides: [ownerSide] });
				}
			},
		},
	},
	{
		id: '35',
		name: 'Solo Burning',
		type: 'spell',
		colors: ['red'],
		attack: 10,
		description: 'If this is the only card in your RED slot, +10 to attack',
		effects: {
			beforeCombat: async function* ({ game, actions, turn, ownerSide, thisCard }) {
				const redStack = game.board.players[ownerSide].stacks.red;
				if (redStack.length === 1 && topOf(redStack) === thisCard) {
					yield* actions.addTurnExtraDamage({ side: ownerSide, amount: 10, turn });
				}
			},
		},
	},
	{
		id: '36',
		name: 'Magnetic force',
		type: 'spell',
		colors: ['red', 'blue'],
		attack: 0,
		description:
			'X Attack, where X is the sum of the two other spell slots attacks. When this spell deals damage, discard it.',
		effects: {
			beforeCombat: async function* ({ game, actions, turn, ownerSide, thisCard }) {
				const ownerSpell = turn.spells?.[ownerSide];
				if (!ownerSpell) return;
				if (ownerSpell.card !== thisCard) return;

				const otherSpells = STACKS.filter(stack => stack !== ownerSpell.slot)
					.map(stack => game.board.players[ownerSide].stacks[stack])
					.filter(Boolean)
					.map(topOf)
					.filter(Boolean);

				const attackSum = otherSpells.reduce((acc, spell) => acc + spell.attack, 0);
				yield* actions.addTurnExtraDamage({ side: ownerSide, amount: attackSum, turn });
			},
			onDealDamage: async function* ({ actions, game, thisCard, ownerSide }) {
				const thisCardStack = STACKS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!thisCardStack) return;
				yield* actions.discard({
					card: thisCard,
					from: game.board.players[ownerSide].stacks[thisCardStack],
					side: ownerSide,
				});
			},
		},
	},
	{
		id: '37',
		name: 'Prevent harm',
		type: 'spell',
		attack: 0,
		heal: 10,
		description:
			'If this spell is chosen as an attack, any damage caused during combat is nulled. Remove this card from play after used in combat.',
		colors: ['blue'],
		effects: {
			beforeCombat: async function* ({ actions, turn, ownerSide, opponentSide, thisCard }) {
				const ownerSpell = turn.spells?.[ownerSide];
				if (ownerSpell?.card !== thisCard) return;
				yield* actions.addTurnExtraDamage({ side: ownerSide, amount: -999, turn });
				yield* actions.addTurnExtraDamage({ side: opponentSide, amount: -999, turn });
			},
			afterCombat: removeIfUsedInCombat,
		},
	},
	{
		id: '38',
		name: 'Violent Instinct',
		type: 'spell',
		attack: 20,
		colors: ['red'],
		description:
			'If this spell is chosen as an attack, any damage caused during combat is doubled. Remove this card from play after used in combat.',
		effects: {
			beforeCombat: async function* ({ actions, turn, ownerSide, thisCard }) {
				const ownerSpell = turn.spells?.[ownerSide];
				if (ownerSpell?.card !== thisCard) return;
				for (const side of SIDES) {
					const damageFromCard = turn.spells?.[side]?.card?.attack ?? 0;
					const damageFromExtra = turn.extraDamage?.[side] ?? 0;
					yield* actions.addTurnExtraDamage({ side, amount: damageFromCard + damageFromExtra, turn });
				}
			},
			afterCombat: removeIfUsedInCombat,
		},
	},
	{ id: '39', name: 'Fireball', type: 'spell', attack: 10, colors: ['red'], description: '', effects: {} },
	{ id: '40', name: 'Flaming Sword', type: 'spell', attack: 10, colors: ['red'], description: '', effects: {} },
	{ id: '41', name: 'Flaming Bow', type: 'spell', attack: 10, colors: ['red'], description: '', effects: {} },
	{ id: '42', name: 'Ice Shard', type: 'spell', attack: 10, colors: ['blue'], description: '', effects: {} },
	{ id: '42', name: 'Frost Bow', type: 'spell', attack: 10, colors: ['blue'], description: '', effects: {} },
	{ id: '43', name: 'Frozen Sword', type: 'spell', attack: 10, colors: ['blue'], description: '', effects: {} },
	{ id: '44', name: 'Earth Spike', type: 'spell', attack: 10, colors: ['green'], description: '', effects: {} },
	{ id: '45', name: 'Metal Bullet', type: 'spell', attack: 10, colors: ['green'], description: '', effects: {} },
	{ id: '46', name: 'Steel Sword', type: 'spell', attack: 10, colors: ['green'], description: '', effects: {} },
	{
		id: '47',
		name: 'Necromancy',
		type: 'spell',
		attack: 5,
		colors: ['green', 'red'],
		description:
			'If this spell is used in combat, prevents any damage from being caused to you this turn, then discard it.',
		effects: {
			beforeCombat: async function* ({ actions, turn, ownerSide, thisCard, opponentSide }) {
				const ownerSpell = turn.spells?.[ownerSide];
				if (ownerSpell?.card !== thisCard) return;
				yield* actions.addTurnExtraDamage({ side: opponentSide, amount: -999, turn });
			},
			afterCombat: removeIfUsedInCombat,
		},
	},
	{
		id: '48',
		name: 'Windy valley',
		type: 'field',
		color: 'green',
		description:
			'Green spells have +5 attack. If this field effect fails to be placed, also removes the field effect who overtook it.',
		effects: {
			beforeCombat: async function* ({ turn, actions }) {
				for (const side of SIDES) {
					const attackingSpell = turn.spells?.[side];
					if (!attackingSpell) continue;
					const card = attackingSpell.card;
					if (!card?.colors.includes('green')) continue;
					yield* actions.addTurnExtraDamage({ side, amount: 5, turn });
				}
			},
			onClashLose: async function* ({ actions, game, winnerCard }) {
				if (!winnerCard) return;
				yield* actions.discard({ card: winnerCard, from: game.board.field, side: 'sideA' });
			},
		},
	},
	{
		id: '49',
		name: 'Fired Up',
		type: 'field',
		color: 'red',
		description:
			'Each player’s damage is increased by 5X, where X is the number of active spells they own with the word “Fire” in their title, and this card.',
		effects: {
			beforeCombat: async function* ({ game, turn, actions }) {
				for (const side of SIDES) {
					const activeSpells = STACKS.map(stack => game.board.players[side].stacks[stack])
						.map(topOf)
						.filter(Boolean);
					const fireSpells = activeSpells.filter(spell => spell.name.toLowerCase().includes('fire'));
					const extraDamage = 5 * (fireSpells.length + 1);
					yield* actions.addTurnExtraDamage({ side, amount: extraDamage, turn });
				}
			},
		},
	},
	{
		id: '50',
		name: 'Nature’s Bounty',
		type: 'field',
		color: 'green',
		description:
			'At the beggining of each turn, each player heals 2X HP, where X is the number of active spells they own with the name “Wood” in their title.',
		effects: {
			beforeDraw: async function* ({ game, actions }) {
				for (const side of SIDES) {
					const activeSpells = STACKS.map(stack => game.board.players[side].stacks[stack])
						.map(topOf)
						.filter(Boolean);
					const woodSpells = activeSpells.filter(spell => spell.name.toLowerCase().includes('wood'));
					const healAmount = 2 * woodSpells.length;
					yield* actions.healPlayer({ side, amount: healAmount });
				}
			},
		},
	},
];

export const notImplementedCards: DbCard[] = [
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
		id: '15',
		type: 'spell',
		name: 'Sword-breaker',
		colors: ['red'],
		attack: 5,
		description: 'If this spell is beaten, discard the card that beat it. (NOT IMPLEMENTED)',
		effects: {},
	},
	{
		id: '31',
		name: 'Arid desert',
		type: 'field',
		color: 'red',
		description: 'BLUE cards cannot trigger effects. (NOT IMPLEMENTED)',
		effects: {},
	},
	{
		id: '32',
		name: 'Flooded Valley',
		type: 'field',
		color: 'blue',
		description: 'GREEN cards cannot trigger effects. (NOT IMPLEMENTED)',
		effects: {},
	},
	{
		id: '33',
		name: 'Wet Woodlands',
		type: 'field',
		color: 'green',
		description: 'RED cards cannot trigger effects. (NOT IMPLEMENTED)',
		effects: {},
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
		id: '24',
		name: 'Augmentation Device',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '5+X, where X is the attack of the card below this. (NOT IMPLEMENTED)',
		effects: {},
	},
];
