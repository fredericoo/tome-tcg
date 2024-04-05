import { invariant, noop } from '../../lib/utils';
import { topOf } from '../engine/engine.board';
import { CARD_TYPES, COLORS, DbCard, SIDES, Side } from '../engine/engine.game';
import { ACTIVATABLE_HOOKS, effectVfx } from '../engine/engine.hooks';
import { removeIfUsedInCombat, resolveCombatValue } from './card.fns.utils';

export const deck: DbCard[] = [
	{
		id: '1',
		name: 'Frostfire Bolt',
		type: 'spell',
		attack: 20,
		colors: ['red', 'blue'],
		description: 'When this card is revealed, discard 1 BLUE or RED spell from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.vfx(effectVfx(thisCard));

				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: {
							from: 'self',
							max: 1,
							min: 1,
							availableColors: ['blue', 'red'],
							availableTypes: CARD_TYPES,
							skippable: false,
							message: 'Discard a card from your hand',
						},
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
							});
						},
					},
					timeoutMs: 1000000,
					// TODO: discard a random card from hand.
					onTimeout: noop,
				});
			},
		},
	},
	{
		id: '2',
		name: 'Burning Branch',
		image: 'burning-branch',
		type: 'spell',
		attack: 20,
		colors: ['red', 'green'],
		description: 'When this card is revealed, discard 1 RED or GREEN (NOT IMPLEMENTED) spell from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: {
							from: 'self',
							max: 1,
							min: 1,
							availableTypes: CARD_TYPES,
							availableColors: COLORS,
							skippable: false,
							message: 'Discard a card from your hand',
						},
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
							});
						},
					},
					timeoutMs: 1000000,
					// TODO: discard a random card from hand.
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
		description: 'When this card is revealed, discard 1 BLUE or GREEN (NOT IMPLEMENTED) spell from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: {
							from: 'self',
							max: 1,
							min: 1,
							availableColors: COLORS,
							availableTypes: CARD_TYPES,
							skippable: false,
							message: 'Discard a card from your hand',
						},
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
							});
						},
					},
					timeoutMs: 1000000,
					// TODO: discard a random card from hand.
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
		image: 'sacred-pool',
		description: 'Whenever you attack with a spell from the blue stack, you heal 10HP.',
		color: 'blue',
		effects: {
			beforeDamage: async function* ({ game, thisCard, actions }) {
				for (const side of SIDES) {
					if (game.turn[side].spellAttack?.slot === 'blue') {
						yield* actions.vfx(effectVfx(thisCard));
						yield* actions.healPlayer({ side, amount: 10 });
					}
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
			onDealDamage: async function* ({ actions, opponentSide, game, thisCard }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.green);
				if (!cardToDiscard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.green,
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
			onDealDamage: async function* ({ actions, opponentSide, game, thisCard }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.red);
				if (!cardToDiscard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.red,
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
			onDealDamage: async function* ({ actions, opponentSide, game, thisCard }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.blue);
				if (!cardToDiscard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({
					card: cardToDiscard,
					from: game.board.players[opponentSide].stacks.blue,
				});
			},
		},
	},
	{
		id: '11',
		type: 'field',
		name: 'Void Space',
		description:
			'Before combat, each player chooses one of their spell slots, and discards the top card from it. Then discard this card.',
		color: null,
		effects: {
			beforeCombat: async function* ({ actions, game, thisCard }) {
				const selectStackAndDiscard = (side: Side) => {
					const stacksWithCards = COLORS.filter(stack => game.board.players[side].stacks[stack].length > 0);
					if (stacksWithCards.length === 0) return;
					return actions.playerAction({
						action: {
							type: 'select_spell_stack',
							config: {
								min: 1,
								max: 1,
								from: 'self',
								skippable: false,
								availableStacks: stacksWithCards,
								message: 'Discard the top from a stack',
							},
							onAction: function* ({ stacks }) {
								const stack = stacks[0];
								if (!stack) return;
								const cardToDiscard = topOf(game.board.players[side].stacks[stack]);
								if (cardToDiscard) {
									yield* actions.discard({
										card: cardToDiscard,
										from: game.board.players[side].stacks[stack],
									});
								}
							},
						},
						sides: [side],
						timeoutMs: 100000,
						// TODO: discard a random card from the stack.
						onTimeout: noop,
					});
				};
				const ownerDiscard = selectStackAndDiscard('sideA');
				if (ownerDiscard) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* ownerDiscard;
				}
				const opponentDiscard = selectStackAndDiscard('sideB');
				if (opponentDiscard) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* opponentDiscard;
				}
				yield* actions.discard({ card: thisCard, from: game.board.field });
			},
		},
	},
	{
		id: '12',
		type: 'spell',
		name: 'Overgrown root',
		image: 'overgrown-root',
		description: '6X attack, where X is the number of cards in this stack.',
		attack: {
			label: '6X',
			getValue({ game, ownerSide, thisCard }) {
				const stack = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!stack) return 6;
				return 6 * game.board.players[ownerSide].stacks[stack].length;
			},
		},
		colors: ['green'],
		effects: {},
	},
	{
		id: '15',
		type: 'spell',
		name: 'Sword-breaker',
		colors: ['red'],
		attack: 5,
		description: 'If this spell is beaten, discard the card that beat it.',
		effects: {
			onClashLose: async function* ({ actions, game, winnerCard, opponentSide, thisCard }) {
				if (!winnerCard) return;
				const stackToDiscardFrom = COLORS.find(stack =>
					game.board.players[opponentSide].stacks[stack].includes(winnerCard),
				);
				if (!stackToDiscardFrom) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({
					card: winnerCard,
					from: game.board.players[opponentSide].stacks[stackToDiscardFrom],
				});
			},
		},
	},
	{
		id: '13',
		type: 'field',
		name: 'Unstable Ground',
		description: 'If both players attack with the same spell colour, both take 10 damage.',
		color: null,
		effects: {
			beforeDamage: async function* ({ thisCard, game, actions }) {
				if (game.turn.sideA.spellAttack?.slot === game.turn.sideB.spellAttack?.slot) {
					yield* actions.vfx(effectVfx(thisCard));
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
			onDealDamage: async function* ({ actions, game, opponentSide, ownerSide, thisCard }) {
				if (game.board.players[opponentSide].hand.length === 0) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: {
							from: 'opponent',
							max: 1,
							min: 1,
							availableTypes: CARD_TYPES,
							availableColors: COLORS,
							skippable: true,
							message: 'Discard from opponent’s hand',
						},
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[opponentSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[opponentSide].hand,
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
			afterDamage: async function* ({ game, actions, thisCard }) {
				const playerA = game.board.players.sideA;
				const playerB = game.board.players.sideB;
				if (playerA.hp === playerB.hp) return;
				const playerWithLeastHp = playerA.hp < playerB.hp ? playerA : playerB;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.draw({ sides: [playerWithLeastHp.side] });
			},
		},
	},
	{
		id: '17',
		type: 'field',
		image: 'spreading-fire',
		name: 'Spreading Fire',
		description: 'Whenever you attack with a red spell, draw 1 card',
		color: 'red',
		effects: {
			beforeDamage: async function* ({ actions, game, thisCard }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'red') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'red') drawingSides.push('sideB');
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.draw({ sides: drawingSides });
			},
		},
	},
	{
		id: '18',
		type: 'field',
		name: 'Hailstorm',
		image: 'hailstorm',
		description: 'Whenever you attack with a blue spell, draw 1 card',
		color: 'blue',
		effects: {
			beforeDamage: async function* ({ actions, game, thisCard }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'blue') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'blue') drawingSides.push('sideB');
				if (drawingSides.length === 0) return;
				yield* actions.vfx(effectVfx(thisCard));
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
			beforeDamage: async function* ({ actions, game, thisCard }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'green') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'green') drawingSides.push('sideB');
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.draw({ sides: drawingSides });
			},
		},
	},

	{
		id: '23',
		name: 'Tall grass',
		image: 'tall-grass',
		type: 'field',
		color: 'green',
		description: 'Green spells deal 5 extra damage',
		effects: {
			beforeCombat: async function* ({ game, thisCard, actions }) {
				for (const combat of game.turn.combatStack) {
					if (!combat.source) continue;
					if (combat.source.type !== 'spell') continue;
					if (combat.type !== 'damage') continue;
					if (!combat.source.colors.includes('green')) continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.increaseCombatDamage({ combatItem: combat, amount: 5 });
				}
			},
		},
	},
	{
		id: '24',
		name: 'Augmentation Device',
		type: 'spell',
		colors: [],
		attack: {
			label: '5+X',
			getValue(params) {
				const { game, ownerSide, thisCard } = params;
				const stack = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!stack) return 5;
				const cardBelow = game.board.players[ownerSide].stacks[stack].find(
					(_, index) => game.board.players[ownerSide].stacks[stack][index + 1] === thisCard,
				);
				if (!cardBelow) return 5;
				return resolveCombatValue(cardBelow.attack, { ...params, thisCard: cardBelow }) + 5;
			},
		},
		description: 'Where X is the attack of the card below this.',
		effects: {},
	},
	{
		id: '25',
		name: 'Meteor shower',
		image: 'meteor-storm',
		type: 'field',
		color: 'red',
		description:
			'When this card is revealed, discard 1 GREEN card from your hand (NOT IMPLEMENTED). Before the next casting phase, discard the top card from both player’s green stacks, then discard this card.',
		effects: {
			beforeCast: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					const cardToDiscard = topOf(game.board.players[side].stacks.green);
					if (cardToDiscard) {
						yield* actions.vfx(effectVfx(thisCard));
						yield* actions.discard({
							card: cardToDiscard,
							from: game.board.players[side].stacks.green,
						});
					}
				}
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: thisCard, from: game.board.field });
			},
		},
	},
	{
		id: '26',
		name: 'Syphon Earth',
		type: 'spell',
		colors: ['red'],
		attack: 8,
		description: 'When this spell deals damage, activate the effect of your top GREEN card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.green);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard });
				}
			},
		},
	},
	{
		id: '27',
		name: 'Syphon Water',
		type: 'spell',
		colors: ['green'],
		attack: 8,
		description: 'When this spell deals damage, activate the effect of your top BLUE card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.blue);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard });
				}
			},
		},
	},
	{
		id: '28',
		name: 'Syphon Fire',
		type: 'spell',
		colors: ['blue'],
		attack: 8,
		description: 'When this spell deals damage, activate the effect of your top RED card.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard }) {
				const card = topOf(game.board.players[ownerSide].stacks.red);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard });
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
		heal: 6,
		description: 'When this spell is beaten, discard it.',
		effects: {
			onClashLose: async function* ({ actions, game, winnerCard, thisCard }) {
				if (!winnerCard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: winnerCard, from: game.board.field });
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
			onDealDamage: async function* ({ actions, game, thisCard }) {
				const fieldEffect = topOf(game.board.field);
				if (!fieldEffect) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: fieldEffect, from: game.board.field });
			},
		},
	},

	{
		id: '34',
		name: 'Ice Tendrill',
		type: 'spell',
		colors: ['green', 'blue'],
		description:
			'When this spell is placed in the GREEN stack, this card has +5 Attack. When this spell is placed in the BLUE stack, draw a card',
		attack: {
			label: '8',
			getValue({ game, ownerSide, thisCard }) {
				if (topOf(game.board.players[ownerSide].stacks.green) === thisCard) return 13;
				return 8;
			},
		},
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				if (game.board.players[ownerSide].casting.blue.includes(thisCard)) {
					yield* actions.vfx(effectVfx(thisCard));
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
		attack: {
			label: '10',
			getValue({ game, ownerSide, thisCard }) {
				const redStack = game.board.players[ownerSide].stacks.red;
				if (redStack.length === 1 && topOf(redStack) === thisCard) {
					return 15;
				}
				return 10;
			},
		},
		description: 'If this is the only card in your RED slot, this card has +5 attack',
		effects: {},
	},
	{
		id: '36',
		name: 'Magnetic force',
		type: 'spell',
		colors: ['red', 'blue'],
		attack: {
			label: 'X',
			getValue({ game, ownerSide, opponentSide, thisCard }) {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return 0;

				const otherSpells = COLORS.filter(stack => stack !== thisStack)
					.map(stack => game.board.players[ownerSide].stacks[stack])
					.filter(Boolean)
					.map(topOf)
					.filter(Boolean);

				const attackSum = otherSpells.reduce(
					(acc, spell) => acc + resolveCombatValue(spell.attack, { game, opponentSide, ownerSide, thisCard: spell }),
					0,
				);
				return attackSum;
			},
		},
		description:
			'X Attack, where X is the sum of the two other spell slots attacks. When this spell deals damage, discard it.',
		effects: {
			onDealDamage: async function* ({ actions, game, thisCard, ownerSide }) {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({
					card: thisCard,
					from: game.board.players[ownerSide].stacks[thisStack],
				});
			},
		},
	},
	{
		id: '37',
		name: 'Prevent harm',
		image: 'prevent-harm',
		type: 'spell',
		attack: 0,
		heal: 10,
		description:
			'If this spell is chosen as an attack, any damage caused during combat is nulled. Remove this card from play after used in combat.',
		colors: ['blue'],
		effects: {
			beforeDamage: async function* ({ game, ownerSide, thisCard, actions }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				yield* actions.vfx(effectVfx(thisCard));
				for (const combat of game.turn.combatStack) {
					if (combat.type === 'damage') {
						yield* actions.decreaseCombatDamage({ combatItem: combat, amount: combat.value });
					}
				}
			},
			afterDamage: removeIfUsedInCombat,
		},
	},
	{
		id: '38',
		name: 'Violent Instinct',
		type: 'spell',
		attack: 15,
		colors: ['red'],
		description:
			'If this spell is chosen as an attack, any damage caused during combat is doubled. Remove this card from play after used in combat.',
		effects: {
			beforeDamage: async function* ({ game, ownerSide, thisCard, actions }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				for (const combat of game.turn.combatStack) {
					if (combat.type !== 'damage') continue;
					combat.value *= 2;
				}
				yield* actions.vfx(effectVfx(thisCard));
				yield game;
			},
			afterDamage: removeIfUsedInCombat,
		},
	},
	{ id: '39', name: 'Fireball', type: 'spell', attack: 11, colors: ['red'], description: '', effects: {} },
	{ id: '40', name: 'Flaming Sword', type: 'spell', attack: 11, colors: ['red'], description: '', effects: {} },
	{ id: '41', name: 'Flaming Bow', type: 'spell', attack: 11, colors: ['red'], description: '', effects: {} },
	{ id: '42', name: 'Ice Shard', type: 'spell', attack: 11, colors: ['blue'], description: '', effects: {} },
	{ id: '42', name: 'Frost Bow', type: 'spell', attack: 11, colors: ['blue'], description: '', effects: {} },
	{ id: '43', name: 'Frozen Sword', type: 'spell', attack: 11, colors: ['blue'], description: '', effects: {} },
	{ id: '44', name: 'Earth Spike', type: 'spell', attack: 11, colors: ['green'], description: '', effects: {} },
	{ id: '45', name: 'Metal Bullet', type: 'spell', attack: 11, colors: ['green'], description: '', effects: {} },
	{ id: '46', name: 'Steel Sword', type: 'spell', attack: 11, colors: ['green'], description: '', effects: {} },
	{
		id: '47',
		name: 'Necromancy',
		type: 'spell',
		attack: 5,
		colors: ['green', 'red'],
		description:
			'If this spell is used in combat, prevents any damage from being caused to you this turn, then discard it.',
		effects: {
			beforeCombat: async function* ({ game, ownerSide, thisCard, actions }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				yield* actions.vfx(effectVfx(thisCard));
				for (const combat of game.turn.combatStack) {
					if (combat.type === 'damage' && combat.target === ownerSide) {
						yield* actions.decreaseCombatDamage({ combatItem: combat, amount: combat.value });
					}
				}
			},
			afterDamage: removeIfUsedInCombat,
		},
	},
	{
		id: '48',
		name: 'Windy valley',
		image: 'windy-valley',
		type: 'field',
		color: 'green',
		description:
			'Green spells have +5 attack. If this field effect fails to be placed, also removes the field effect who overtook it.',
		effects: {
			beforeCombat: async function* ({ game, actions, thisCard }) {
				for (const combat of game.turn.combatStack) {
					if (!combat.source) continue;
					if (combat.source.type !== 'spell') continue;
					if (combat.type !== 'damage') continue;
					if (!combat.source.colors.includes('green')) continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.increaseCombatDamage({ combatItem: combat, amount: 5 });
				}
				yield game;
			},
			onClashLose: async function* ({ actions, game, winnerCard, thisCard }) {
				if (!winnerCard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: winnerCard, from: game.board.field });
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
			beforeCombat: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					const activeSpells = COLORS.map(stack => game.board.players[side].stacks[stack])
						.map(topOf)
						.filter(Boolean);
					const fireSpells = activeSpells.filter(spell => spell.name.toLowerCase().includes('fire'));
					const extraDamage = 5 * (fireSpells.length + 1);
					yield* actions.vfx(effectVfx(thisCard));
					for (const combat of game.turn.combatStack) {
						if (combat.target !== side && combat.type === 'damage') {
							for (const spell of fireSpells) yield* actions.vfx(effectVfx(spell));
							yield* actions.increaseCombatDamage({ combatItem: combat, amount: extraDamage });
						}
					}
				}
				yield game;
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
			beforeDraw: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					const activeSpells = COLORS.map(stack => game.board.players[side].stacks[stack])
						.map(topOf)
						.filter(Boolean);
					const woodSpells = activeSpells.filter(spell => spell.name.toLowerCase().includes('wood'));
					const healAmount = 2 * woodSpells.length;
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.healPlayer({ side, amount: healAmount });
				}
			},
		},
	},
	{
		id: '55',
		name: 'Burning flame',
		type: 'spell',
		colors: ['red'],
		attack: 18,
		description:
			'Every time this spell deals damage, discard the top card from the GREEN stack. If there’s no more cards to discard, discard Burning flame.',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, thisCard }) {
				const cardToDiscard = topOf(game.board.players[ownerSide].stacks.green);
				if (!cardToDiscard) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.discard({ card: thisCard, from: game.board.players[ownerSide].stacks.red });
					return;
				}
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: cardToDiscard, from: game.board.players[ownerSide].stacks.green });
			},
		},
	},
	{
		id: '57',
		name: 'Wind Sceptre',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 30,
		description: 'When this card is revealed, draw one card. Then discard this card.',
		effects: {
			onReveal: async function* ({ actions, game, ownerSide, thisCard }) {
				const currentColor = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!currentColor) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.draw({ sides: [ownerSide] });
				yield* actions.discard({
					card: thisCard,
					from: game.board.players[ownerSide].stacks[currentColor],
				});
			},
		},
	},
	{
		id: '58',
		name: 'Fire Starter',
		type: 'spell',
		colors: ['red'],
		attack: 8,
		description:
			'After a successful attack, you *may* (NOT IMPLEMENTED) send a GREEN or NEUTRAL [FIELD] spell to the discard pile.',
		// TODO: confirmation of "activate <spellname> effect?" for cards worded MAY
		effects: {
			onDealDamage: async function* ({ actions, game, thisCard }) {
				const fieldToDiscard = topOf(game.board.field);
				if (fieldToDiscard?.color === 'green' || fieldToDiscard?.color === null) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.discard({ card: fieldToDiscard, from: game.board.field });
				}
			},
		},
	},
	{
		id: '59',
		name: 'Extinguishing Spray',
		type: 'spell',
		colors: ['blue'],
		attack: 8,
		description:
			'After a successful attack, you *may* (NOT IMPLEMENTED) send a RED or NEUTRAL [FIELD] spell to the discard pile.',
		// TODO: confirmation of "activate <spellname> effect?" for cards worded MAY
		effects: {
			onDealDamage: async function* ({ actions, game, thisCard }) {
				const fieldToDiscard = topOf(game.board.field);
				if (fieldToDiscard?.color === 'red' || fieldToDiscard?.color === null) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.discard({ card: fieldToDiscard, from: game.board.field });
				}
			},
		},
	},
	{
		id: '60',
		name: 'Parched Earth',
		type: 'spell',
		colors: ['green'],
		attack: 8,
		description:
			'After a successful attack, you *may* (NOT IMPLEMENTED) send a BLUE or NEUTRAL [FIELD] spell to the discard pile.',
		effects: {
			onDealDamage: async function* ({ actions, game, thisCard }) {
				const fieldToDiscard = topOf(game.board.field);
				if (fieldToDiscard?.color === 'blue' || fieldToDiscard?.color === null) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.discard({ card: fieldToDiscard, from: game.board.field });
				}
			},
		},
	},
	{
		id: '61',
		name: 'Wobbly bridge',
		type: 'field',
		color: 'green',
		description: 'Spells deal +2X damage during combat, where X is the size of the field effect stack',
		effects: {
			beforeCombat: async function* ({ game, thisCard, actions }) {
				const fieldEffectStack = game.board.field.length;
				for (const combat of game.turn.combatStack) {
					if (!combat.source) continue;
					if (combat.type !== 'damage') continue;
					if (combat.source.type !== 'spell') continue;
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.increaseCombatDamage({ combatItem: combat, amount: 2 * fieldEffectStack });
				}
			},
		},
	},
	{
		id: '62',
		name: 'Mirror shield',
		type: 'spell',
		colors: [],
		attack: 0,
		description:
			'If this spell is beaten in combat, the damage that would have been caused to you is caused to the opponent instead. If this spell is not beaten in combat, discard it.',
		effects: {
			onClashWin: async function* ({ actions, game, thisCard, ownerSide }) {
				const currentColor = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!currentColor) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: thisCard, from: game.board.players[ownerSide].stacks[currentColor] });
			},
			onClashLose: async function* ({ game, ownerSide, opponentSide, actions, thisCard }) {
				yield* actions.vfx(effectVfx(thisCard));
				for (const combat of game.turn.combatStack) {
					if (combat.type !== 'damage') continue;
					if (combat.target !== ownerSide) continue;
					combat.target = opponentSide;
				}
				yield game;
			},
		},
	},
	{
		id: '63',
		name: 'Cannon Fire',
		type: 'spell',
		colors: ['red'],
		attack: 25,
		description:
			'When this spell is used in combat, select a card from your hand and discard it. If you don’t have cards to discard, discard Cannon Fire instead.',
		effects: {
			beforeCombat: async function* ({ game, actions, ownerSide, thisCard }) {
				const isUsedInCombat = game.turn[ownerSide].spellAttack?.card === thisCard;
				if (!isUsedInCombat) return;
				if (game.board.players[ownerSide].hand.length === 0) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.discard({ card: thisCard, from: game.board.players[ownerSide].stacks.red });
					return;
				}
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					sides: [ownerSide],
					action: {
						type: 'select_from_hand',
						config: {
							from: 'self',
							max: 1,
							min: 1,
							availableTypes: CARD_TYPES,
							availableColors: COLORS,
							message: 'Discard a card from your hand',
						},
						onAction: function* ({ cardKeys }) {
							const cardToDiscard = game.board.players[ownerSide].hand.find(card => cardKeys.includes(card.key));
							invariant(cardToDiscard, 'Card to discard not found');
							yield* actions.discard({
								card: cardToDiscard,
								from: game.board.players[ownerSide].hand,
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
		id: '87',
		name: 'Red Orb',
		type: 'spell',
		colors: ['red'],
		attack: {
			label: '11',
			getValue: ({ game, ownerSide, thisCard }) => {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return 11;

				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate =
					isMarbleFieldActive || topOf(game.board.players[ownerSide].stacks[thisStack]) === thisCard;
				if (shouldActivate) {
					const cardUnderThis = game.board.players[ownerSide].stacks[thisStack][1];
					if (cardUnderThis?.name.toLowerCase().includes('orb')) return 20;
				}
				return 11;
			},
		},
		description: 'When cast on top of another Orb, +9 Attack',
		effects: {},
	},
	{
		id: '88',
		name: 'Blue Orb',
		type: 'spell',
		colors: ['blue'],
		attack: 11,
		description: 'When cast on top of another Orb, Draw 2 cards',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				const cardUnderThis = topOf(game.board.players[ownerSide].stacks.blue);
				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate = isMarbleFieldActive || cardUnderThis?.name.toLowerCase().includes('orb');
				if (!shouldActivate) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.draw({ sides: [ownerSide] });
				yield* actions.draw({ sides: [ownerSide] });
			},
		},
	},
	{
		id: '89',
		name: 'Green Orb',
		type: 'spell',
		colors: ['green'],
		attack: 1,
		description: 'When cast on top of another orb, Heals 20 HP',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				const cardUnderThis = topOf(game.board.players[ownerSide].stacks.green);
				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate = isMarbleFieldActive || cardUnderThis?.name.toLowerCase().includes('orb');
				if (!shouldActivate) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.healPlayer({ side: ownerSide, amount: 20 });
			},
		},
	},
	{
		id: '90',
		name: 'Purple Orb',
		type: 'spell',
		colors: ['blue', 'red'],
		attack: 11,
		description: 'When cast on top of another orb, discard the current field effect',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return;
				const cardUnderThis = topOf(game.board.players[ownerSide].stacks[thisStack]);
				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate = isMarbleFieldActive || cardUnderThis?.name.toLowerCase().includes('orb');
				if (!shouldActivate) return;
				const fieldToDiscard = topOf(game.board.field);
				if (!fieldToDiscard) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.discard({ card: fieldToDiscard, from: game.board.field });
			},
		},
	},
	{
		id: '91',
		name: 'Brown Orb',
		type: 'spell',
		colors: ['green', 'red'],
		attack: 11,
		description: 'When cast on top of another orb, choose a stack colour, and remove the top of that opponent’s stack.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, opponentSide, thisCard }) {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return;
				const cardUnderThis = topOf(game.board.players[ownerSide].stacks[thisStack]);
				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate = isMarbleFieldActive || cardUnderThis?.name.toLowerCase().includes('orb');
				if (!shouldActivate) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					timeoutMs: 10000,
					onTimeout: noop,
					sides: [ownerSide],
					action: {
						type: 'select_spell_stack',
						config: {
							availableStacks: COLORS,
							from: 'opponent',
							message: 'Choose a stack to remove the top card from',
							min: 1,
							max: 1,
						},
						onAction: function* ({ stacks }) {
							for (const stack of stacks) {
								const cardToDiscard = topOf(game.board.players[opponentSide].stacks[stack]);
								if (!cardToDiscard) continue;
								yield* actions.discard({ card: cardToDiscard, from: game.board.players[opponentSide].stacks[stack] });
							}
						},
					},
				});
			},
		},
	},
	{
		id: '92',
		name: 'Yellow Orb',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 11,
		description: 'When cast on top of another orb, deals 10 damage to the opponent',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, opponentSide, thisCard }) {
				const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
				if (!thisStack) return;
				const cardUnderThis = topOf(game.board.players[ownerSide].stacks[thisStack]);
				const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
				const shouldActivate = isMarbleFieldActive || cardUnderThis?.name.toLowerCase().includes('orb');
				if (!shouldActivate) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.damagePlayer({ amount: 10, side: opponentSide });
			},
		},
	},
	{
		id: '93',
		name: 'Dull Orb',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '',
		effects: {},
	},
	{
		id: '94',
		name: 'Marble field',
		type: 'field',
		color: null,
		description: 'All “Orb” cards effect activate without needing an “Orb” card below them',
		effects: {},
	},
	{
		id: '65',
		name: 'Tsunami',
		type: 'spell',
		colors: ['blue'],
		attack: {
			label: 'X',
			getValue: ({ game }) => game.board.players.sideA.stacks.blue.length + game.board.players.sideB.stacks.blue.length,
		},
		description: 'X Attack, where X is the combined number of cards in both player’s BLUE spell stacks',
		effects: {},
	},
	{
		id: '52',
		name: 'Uncast',
		type: 'spell',
		colors: ['blue'],
		attack: 0,
		description: 'Whenever this spell is revealed, remove all cards being revealed this turn from play.',
		effects: {
			onReveal: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					for (const stack of [...COLORS, 'field' as const])
						for (const card of game.board.players[side].casting[stack]) {
							yield* actions.vfx(effectVfx(thisCard));
							yield* actions.discard({ card, from: game.board.players[side].casting[stack] });
						}
				}
			},
		},
	},
	{
		id: '64',
		name: 'Bull’s eye shot',
		type: 'spell',
		colors: [],
		attack: {
			label: '4X',
			getValue: ({ game }) => {
				let multiplier = 0;
				if (topOf(game.board.field)?.color === null) multiplier++;
				for (const stack of COLORS) {
					if (topOf(game.board.players.sideA.stacks[stack])?.colors.length === 0) multiplier++;
					if (topOf(game.board.players.sideB.stacks[stack])?.colors.length === 0) multiplier++;
				}
				return 4 * multiplier;
			},
		},
		description: '4X Attack, where X is the number of NEUTRAL cards in play.',
		effects: {},
	},
	{
		id: '66',
		name: 'Community Hall',
		type: 'field',
		color: null,
		description:
			'At the beginning of each turn, the player with the highest HP loses 5 HP, and the player with the lowest HP gains 5 HP.',
		effects: {
			beforeDraw: async function* ({ game, actions, thisCard }) {
				const playerA = game.board.players.sideA;
				const playerB = game.board.players.sideB;
				if (playerA.hp === playerB.hp) return;
				yield* actions.vfx(effectVfx(thisCard));
				const playerWithLeastHp = playerA.hp < playerB.hp ? playerA : playerB;
				const playerWithMostHp = playerA.hp > playerB.hp ? playerA : playerB;
				yield* actions.damagePlayer({ side: playerWithMostHp.side, amount: 5 });
				yield* actions.healPlayer({ side: playerWithLeastHp.side, amount: 5 });
			},
		},
	},
	{
		id: '69',
		name: 'Upheaval',
		type: 'spell',
		colors: [],
		attack: {
			label: '?',
			getValue: ({ game }) => (game.board.field.length === 0 ? 25 : 0),
		},
		description: 'This spell has 25 attack if there are no field effects in play. Otherwise, it has zero attack.',
		effects: {},
	},
	{
		id: '70',
		name: 'Eldritch Blast',
		type: 'spell',
		colors: ['blue', 'green', 'red'],
		attack: {
			label: '10',
			getValue: ({ game, ownerSide }) => {
				let atk = 0;
				const isAgonisingBlastInPlay = topOf(game.board.players[ownerSide].stacks.red)?.id === '71';
				if (isAgonisingBlastInPlay) atk += 10;
				const doubleEffect = topOf(game.board.field)?.id === '74';
				if (doubleEffect) atk *= 2;
				return atk;
			},
		},
		description: '',
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, thisCard }) {
				const isBlessedBlastInPlay = topOf(game.board.players[ownerSide].stacks.blue)?.id === '72';
				const doubleEffect = topOf(game.board.field)?.id === '74';
				if (isBlessedBlastInPlay) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.draw({ sides: [ownerSide] });
					if (doubleEffect) yield* actions.draw({ sides: [ownerSide] });
				}
				const isLeechingBlastInPlay = topOf(game.board.players[ownerSide].stacks.green)?.id === '73';
				if (isLeechingBlastInPlay) {
					yield* actions.vfx(effectVfx(thisCard));
					yield* actions.healPlayer({ side: ownerSide, amount: 20 });
					if (doubleEffect) yield* actions.healPlayer({ side: ownerSide, amount: 20 });
				}
			},
		},
	},
	{
		id: '71',
		name: 'Agonising Blast',
		type: 'spell',
		colors: ['red'],
		attack: 10,
		description: 'If Eldritch Blast is in play on your side of the field, add +10 Attack to Eldritch Blast',
		effects: {},
	},
	{
		id: '72',
		name: 'Blessed Blast',
		type: 'spell',
		colors: ['blue'],
		attack: 10,
		description: 'Whenever Eldritch Blast deals damage, draw 2',
		effects: {},
	},
	{
		id: '73',
		name: 'Leeching Blast',
		type: 'spell',
		colors: ['green'],
		attack: 10,
		description: 'Whenever Eldritch Blast deals damage, heal 20hp',
		effects: {},
	},
	{
		id: '74',
		name: 'Blast Zone',
		type: 'field',
		color: 'red',
		description: 'Trigger all “Blast” spells effects twice',
		effects: {},
	},
	{
		id: '75',
		name: 'Inverse Field',
		type: 'field',
		color: 'blue',
		description: 'Healing does damage and Damage does healing',
		effects: {
			beforeCombat: async function* ({ game, actions, thisCard }) {
				yield* actions.vfx(effectVfx(thisCard));
				for (const combat of game.turn.combatStack) {
					switch (combat.type) {
						case 'damage':
						case 'heal':
							combat.value *= -1;
							break;
					}
				}
				yield game;
			},
		},
	},
	{
		id: '107',
		name: 'Hex',
		type: 'spell',
		colors: [],
		attack: 10,
		description:
			"After successfully dealing damage with this card, choose one of your opponent's stacks. Place this card on top of that stack.",
		effects: {
			onDealDamage: async function* ({ actions, game, ownerSide, thisCard }) {
				const thisStack = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
				if (!thisStack) return;
				yield* actions.vfx(effectVfx(thisCard));
				yield* actions.playerAction({
					sides: [ownerSide],
					onTimeout: noop,
					timeoutMs: 10000,
					action: {
						type: 'select_spell_stack',
						config: {
							message: 'Select a stack to place Hex on',
							from: 'opponent',
							availableStacks: COLORS,
							max: 1,
							min: 1,
						},
						onAction: function* ({ stacks, side }) {
							const opponentSide = side === 'sideA' ? 'sideB' : 'sideA';
							for (const stack of stacks) {
								yield* actions.moveTopCard(
									game.board.players[ownerSide].stacks[thisStack],
									game.board.players[opponentSide].stacks[stack],
								);
							}
						},
					},
				});
			},
		},
	},
];

export const notImplementedCards: DbCard[] = [
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
		id: '51',
		name: 'Magic Shield of Flame',
		type: 'spell',
		colors: ['red'],
		attack: 5,
		description: 'If this spell is beaten, negate the effect of the card that beat it. (NOT IMPLEMENTED)',
		effects: {},
	},

	{
		id: '53',
		name: 'Fields of mana',
		type: 'field',
		color: 'blue',
		description: 'During cast phase, players can cast one more card. Players cannot cast two cards for the same slot.',
		effects: {},
	},
	{
		id: '54',
		name: 'Blue wand',
		type: 'spell',
		colors: ['blue'],
		attack: 8,
		description: 'BLUE field effects trigger twice',
		effects: {},
	},
	{
		id: '56',
		name: 'Barren Land',
		type: 'field',
		color: null,
		description: 'Spells have no effects',
		effects: {},
	},

	{
		id: '67',
		name: 'Hilltop observatory',
		type: 'field',
		color: null,
		description: 'The player with the lowest combined stack of spells keeps their hand revealed',
		effects: {},
	},
	{
		id: '68',
		name: 'Back to Square One',
		type: 'field',
		color: null,
		description: 'All spells have 10 Attack',
		effects: {},
	},

	{
		id: '76',
		name: 'Healing Rain',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 0,
		description: 'Heal all wizards by 15 HP',
		effects: {},
	},
	{
		id: '77',
		name: 'Heal through pain',
		type: 'spell',
		colors: ['green', 'red'],
		attack: 5,
		description:
			'Can only be played if the Field stack is ≥ 3 and the current top Field is BLUE. If the opponent wizard is healed by one of your cards, deal 25 damage to the opposing wizard.',
		effects: {},
	},
	{
		id: '78',
		name: 'Heated Shuffle',
		type: 'spell',
		colors: ['red'],
		attack: 10,
		description: 'If it’s possible, move the top card from your BLUE/GREEN stack to your GREEN/BLUE stack.',
		effects: {},
	},
	{
		id: '79',
		name: 'Flooded Shuffle',
		type: 'spell',
		colors: ['blue'],
		attack: 10,
		description: 'If it’s possible, move the top card from your RED/GREEN stack to your GREEN/RED stack.',
		effects: {},
	},
	{
		id: '80',
		name: 'Sharp Shuffle',
		type: 'spell',
		colors: ['green'],
		attack: 10,
		description: 'If it’s possible, move the top card from your BLUE/RED stack to your RED/BLUE stack.',
		effects: {},
	},
	{
		id: '81',
		name: 'Tactical Flamevine',
		type: 'spell',
		colors: ['green', 'red'],
		attack: 8,
		description:
			'If attacked with this spell and lost combat with a RED/GREEN attack, you may move this spell to the top of the GREEN/RED slot',
		effects: {},
	},
	{
		id: '82',
		name: 'Tactical Chillflare',
		type: 'spell',
		colors: ['blue', 'red'],
		attack: 8,
		description:
			'If attacked with this spell and lost combat with a RED/BLUE attack, you may move this spell to the top of the BLUE/RED slot',
		effects: {},
	},
	{
		id: '83',
		name: 'Tactical Frostleaf',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 8,
		description:
			'If attacked with this spell and lost combat with a BLUE/GREEN attack, you may move this spell to the top of the GREEN/BLUE slot',
		effects: {},
	},
	{
		id: '84',
		name: 'Bokutou',
		type: 'spell',
		colors: [],
		attack: 0,
		description: '',
		effects: {},
	},
	{
		id: '85',
		name: 'Long Form',
		type: 'spell',
		colors: ['blue', 'red'],
		attack: 0,
		description:
			'If attacking with “Bokutou”, add 7X to the attack where X is the number of “Form” cards you have active.',
		effects: {},
	},
	{
		id: '86',
		name: 'Short Form',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 0,
		description: 'If you successfully attacked with “Bokutou”, draw 3 cards',
		effects: {},
	},

	{
		id: '95',
		name: 'Dull Blade',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '',
		effects: {},
	},
	{
		id: '96',
		name: 'Dull Sword',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '',
		effects: {},
	},
	{
		id: '97',
		name: 'Dull Spear',
		type: 'spell',
		colors: [],
		attack: 10,
		description: '',
		effects: {},
	},
	{
		id: '98',
		name: 'Whetstone',
		type: 'field',
		color: 'blue',
		description:
			'All “Dull” spells get +5 Attack before damage. If successfully damaged with a “Dull” card, your opponent takes 2X damage where X is the number of “Dull” spells you control',
		effects: {
			beforeDamage: async function* ({ game, actions, thisCard }) {
				for (const combatItem of game.turn.combatStack) {
					if (combatItem.source?.name.toLowerCase().includes('dull') && combatItem.source.type === 'spell') {
						yield* actions.vfx(effectVfx(thisCard));
						yield* actions.increaseCombatDamage({ combatItem, amount: 5 });
					}
				}
			},
		},
	},
	{
		id: '99',
		name: 'Melting Forge',
		type: 'field',
		color: 'red',
		description:
			'During the Draw Phase, you may discard up to 3 active “Dull” cards you control, and draw as many cards in addition to your normal draw',
		effects: {},
	},
	{
		id: '100',
		name: 'Repurposing Field',
		type: 'field',
		color: 'green',
		description: 'If Attacking with a “Dull” card, choose one spell on the field and add it back to its owner’s hand',
		effects: {},
	},
	{
		id: '101',
		name: 'Balanced Grounds',
		type: 'field',
		color: null,
		description: '“Dull” Spells gain +10 Attack. If successfully damaged with a “Dull” spell, heal 10HP',
		effects: {},
	},
	{
		id: '102',
		name: 'Healing Staff',
		type: 'spell',
		colors: ['green'],
		attack: 8,
		description: 'Every time a player draws a card, you gain 2 HP',
		effects: {},
	},
	{
		id: '103',
		name: 'Greater Sword',
		type: 'spell',
		colors: [],
		attack: 30,
		description:
			'You must have at least 3 cards in your hand to play this card. When this card is revealed, discard 2 cards from your hand.',
		effects: {},
	},
	{
		id: '104',
		name: 'Chain Lightning',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 20,
		description: 'Deal 20 damage to your own wizard.',
		effects: {},
	},
	{
		id: '105',
		name: 'Earthquake',
		type: 'spell',
		colors: ['green', 'red'],
		attack: 30,
		description: 'Deal 30 damage to your own wizard.',
		effects: {},
	},
	{
		id: '106',
		name: 'Raise the Stakes',
		type: 'field',
		color: null,
		description:
			'All spells have 2x attack. After each combat, each player chooses a stack and removes that spell from play. If no spells are removed from play this way, discard Raise the Stakes.',
		effects: {},
	},
];
