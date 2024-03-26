import { invariant, noop } from '../../lib/utils';
import { topOf } from '../engine/engine.board';
import { CARD_TYPES, COLORS, DbCard, SIDES, Side } from '../engine/engine.game';
import { ACTIVATABLE_HOOKS } from '../engine/engine.hooks';
import { removeIfUsedInCombat, resolveCombatValue } from './card.fns.utils';

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
	{
		id: '2',
		name: 'Burning Branch',
		image: 'burning-branch',
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
		description: 'When this card is revealed, discard 1 card from your hand.',
		effects: {
			onReveal: async function* ({ game, actions, ownerSide }) {
				if (game.board.players[ownerSide].hand.length === 0) return;
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
			beforeDamage: async function* ({ game, thisCard, cardEffectHighlight }) {
				for (const side of SIDES) {
					if (game.turn[side].spellAttack?.slot === 'blue') {
						game.turn.combatStack.push({ source: thisCard, target: side, type: 'heal', value: 10 });
						yield cardEffectHighlight;
						yield game;
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
			onDealDamage: async function* ({ actions, opponentSide, game, cardEffectHighlight }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.green);
				if (!cardToDiscard) return;
				yield cardEffectHighlight;
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
			onDealDamage: async function* ({ actions, opponentSide, game }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.red);
				if (!cardToDiscard) return;
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
			onDealDamage: async function* ({ actions, opponentSide, game }) {
				const cardToDiscard = topOf(game.board.players[opponentSide].stacks.blue);
				if (!cardToDiscard) return;
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
		description: 'Before combat, each player chooses one of their spell slots, and discards the top card from it.',
		color: null,
		effects: {
			beforeCombat: async function* ({ actions, game }) {
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
								invariant(stack, 'Stack not found');
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
		image: 'overgrown-root',
		description: '4X attack, where X is the number of cards in this stack.',
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
			onClashLose: async function* ({ actions, game, winnerCard, opponentSide }) {
				if (!winnerCard) return;
				const stackToDiscardFrom = COLORS.find(stack =>
					game.board.players[opponentSide].stacks[stack].includes(winnerCard),
				);
				if (!stackToDiscardFrom) return;
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
		description: 'If both players attack with the same spell stack, both take 10 damage.',
		color: null,
		effects: {
			beforeDamage: async function* ({ thisCard, game }) {
				if (game.turn.sideA.spellAttack?.slot === game.turn.sideB.spellAttack?.slot) {
					game.turn.combatStack.push({ source: thisCard, target: 'sideA', type: 'damage', value: 10 });
					game.turn.combatStack.push({ source: thisCard, target: 'sideB', type: 'damage', value: 10 });
					yield game;
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
			afterDamage: async function* ({ game, actions }) {
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
		image: 'spreading-fire',
		name: 'Spreading Fire',
		description: 'Whenever you attack with a red spell, draw 1 card',
		color: 'red',
		effects: {
			beforeDamage: async function* ({ actions, game }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'red') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'red') drawingSides.push('sideB');
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
			beforeDamage: async function* ({ actions, game }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'blue') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'blue') drawingSides.push('sideB');
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
			beforeDamage: async function* ({ actions, game }) {
				const drawingSides: Side[] = [];
				if (game.turn.sideA.spellAttack?.slot === 'green') drawingSides.push('sideA');
				if (game.turn.sideB.spellAttack?.slot === 'green') drawingSides.push('sideB');
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
			beforeCombat: async function* ({ game }) {
				for (const combat of game.turn.combatStack) {
					if (!combat.source) continue;
					if (combat.source.type !== 'spell') continue;
					if (combat.type !== 'damage') continue;
					if (!combat.source.colors.includes('green')) continue;
					combat.value += 5;
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
				return resolveCombatValue(cardBelow.attack, params) + 5;
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
			'Can only be cast on top of a GREEN field spell (NOT IMPLEMENTED). Before the next casting phase, discard the top card from both player’s green stacks, then discard this card.',
		effects: {
			beforeCast: async function* ({ game, actions, thisCard }) {
				for (const side of SIDES) {
					const cardToDiscard = topOf(game.board.players[side].stacks.green);
					if (cardToDiscard) {
						yield* actions.discard({
							card: cardToDiscard,
							from: game.board.players[side].stacks.green,
						});
					}
				}
				yield* actions.discard({ card: thisCard, from: game.board.field });
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
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard, cardEffectHighlight }) {
				const card = topOf(game.board.players[ownerSide].stacks.green);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard, cardEffectHighlight });
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
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard, cardEffectHighlight }) {
				const card = topOf(game.board.players[ownerSide].stacks.blue);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard, cardEffectHighlight });
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
			onDealDamage: async function* ({ actions, game, ownerSide, opponentSide, thisCard, cardEffectHighlight }) {
				const card = topOf(game.board.players[ownerSide].stacks.red);
				if (!card) return;

				for (const hook of ACTIVATABLE_HOOKS) {
					if (!(hook in card.effects)) continue;
					const effect = card.effects[hook];
					if (!effect) continue;
					yield* effect({ game, actions, ownerSide, opponentSide, thisCard, cardEffectHighlight });
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
			onClashLose: async function* ({ actions, game, winnerCard }) {
				if (!winnerCard) return;
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
			onDealDamage: async function* ({ actions, game }) {
				const fieldEffect = topOf(game.board.field);
				if (!fieldEffect) return;
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
			'When this spell is placed in the GREEN stack, this card has +10 Attack. When this spell is placed in the BLUE stack, draw a card',
		attack: {
			label: '8',
			getValue({ game, ownerSide, thisCard }) {
				if (topOf(game.board.players[ownerSide].stacks.green) === thisCard) {
					return 18;
				}
				return 8;
			},
		},
		effects: {
			onReveal: async function* ({ game, actions, ownerSide, thisCard }) {
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
		attack: {
			label: '10',
			getValue({ game, ownerSide, thisCard }) {
				const redStack = game.board.players[ownerSide].stacks.red;
				if (redStack.length === 1 && topOf(redStack) === thisCard) {
					return 20;
				}
				return 10;
			},
		},
		description: 'If this is the only card in your RED slot, this card has +10 attack',
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
					(acc, spell) => acc + resolveCombatValue(spell.attack, { game, opponentSide, ownerSide, thisCard }),
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
			beforeDamage: async function* ({ game, ownerSide, thisCard }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				for (const combat of game.turn.combatStack) {
					if (combat.type === 'damage') {
						combat.value = 0;
					}
				}
				yield game;
			},
			afterDamage: removeIfUsedInCombat,
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
			beforeDamage: async function* ({ game, ownerSide, thisCard }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				for (const combat of game.turn.combatStack) {
					if (combat.type !== 'damage') continue;
					combat.value *= 2;
				}
				yield game;
			},
			afterDamage: removeIfUsedInCombat,
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
			beforeCombat: async function* ({ game, ownerSide, thisCard }) {
				const ownerSpell = game.turn[ownerSide].spellAttack;
				if (ownerSpell?.card !== thisCard) return;
				for (const combat of game.turn.combatStack) {
					if (combat.type === 'damage' && combat.target === ownerSide) {
						combat.value = 0;
					}
				}
				yield game;
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
			beforeCombat: async function* ({ game }) {
				for (const combat of game.turn.combatStack) {
					if (!combat.source) continue;
					if (combat.source.type !== 'spell') continue;
					if (combat.type !== 'damage') continue;
					if (!combat.source.colors.includes('green')) continue;
					combat.value += 5;
				}
				yield game;
			},
			onClashLose: async function* ({ actions, game, winnerCard }) {
				if (!winnerCard) return;
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
			beforeCombat: async function* ({ game }) {
				for (const side of SIDES) {
					const activeSpells = COLORS.map(stack => game.board.players[side].stacks[stack])
						.map(topOf)
						.filter(Boolean);
					const fireSpells = activeSpells.filter(spell => spell.name.toLowerCase().includes('fire'));
					const extraDamage = 5 * (fireSpells.length + 1);
					for (const combat of game.turn.combatStack) {
						if (combat.target !== side) {
							combat.value += extraDamage;
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
			beforeDraw: async function* ({ game, actions }) {
				for (const side of SIDES) {
					const activeSpells = COLORS.map(stack => game.board.players[side].stacks[stack])
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
		id: '52',
		name: 'Uncast',
		type: 'spell',
		colors: ['blue'],
		attack: 0,
		description: 'Whener this spell is revealed, remove all cards being revealed this turn from play. (NOT IMPLEMENTED)',
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
		id: '55',
		name: 'Burning flame',
		type: 'spell',
		colors: ['red'],
		attack: 18,
		description:
			'Every time this spell deals damage, discard the bottom card from its stack. If there’s no more cards to discard, discard Burning flame.',
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
		id: '57',
		name: 'Wind Sceptre',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 30,
		description: 'When this card is revealed, draw one card. Then destroy this card.',
		effects: {},
	},
	{
		id: '58',
		name: 'Fire Starter',
		type: 'spell',
		colors: ['red'],
		attack: 5,
		description: 'After a successful attack, you may send a GREEN or NEUTRAL [FIELD] spell to the discard pile.',
		effects: {},
	},
	{
		id: '59',
		name: 'Extinguishing Spray',
		type: 'spell',
		colors: ['blue'],
		attack: 5,
		description: 'After a successful attack, you may send a RED or NEUTRAL [FIELD] spell to the discard pile.',
		effects: {},
	},
	{
		id: '60',
		name: 'Parched Earth',
		type: 'spell',
		colors: ['green'],
		attack: 5,
		description: 'After a successful attack, you may send a BLUE or NEUTRAL [FIELD] spell to the discard pile.',
		effects: {},
	},
	{
		id: '61',
		name: 'Wobbly bridge',
		type: 'field',
		color: 'green',
		description: 'Spells deal +X damage during combat, where X is the size of the field effect stack',
		effects: {},
	},
	{
		id: '62',
		name: 'Mirror shield',
		type: 'spell',
		colors: [],
		attack: 0,
		description:
			'If this spell is beaten in combat, the damage that would have been caused to you is caused to the opponent instead. If this spell is not beaten in combat, discard it.',
		effects: {},
	},
	{
		id: '63',
		name: 'Cannon Fire',
		type: 'spell',
		colors: ['red'],
		attack: 16,
		description:
			'When this spell is used in combat, select a card from your hand and discard it. If you don’t have cards to discard, discard Cannon Fire instead.',
		effects: {},
	},
	{
		id: '64',
		name: 'Bull’s eye shot',
		type: 'spell',
		colors: [],
		attack: 0,
		description: '4X Attack, where X is the number of  NEUTRAL cards in play.',
		effects: {},
	},
	{
		id: '65',
		name: 'Tsunami',
		type: 'spell',
		colors: ['blue'],
		attack: 0,
		description: 'X Attack, where X is the combined number of every player’s BLUE spell stacks',
		effects: {},
	},
	{
		id: '66',
		name: 'Community Hall',
		type: 'field',
		color: null,
		description: 'The player with the fewest HP draws one more card during the draw phase',
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
		id: '69',
		name: 'Upheaval',
		type: 'spell',
		colors: [],
		attack: 25,
		description: 'If Field Spell Stack == 0 Else 0 Attack',
		effects: {},
	},
	{
		id: '70',
		name: 'Eldritch Blast',
		type: 'spell',
		colors: ['blue', 'green', 'red'],
		attack: 10,
		description: '',
		effects: {},
	},
	{
		id: '71',
		name: 'Agonising Blast',
		type: 'spell',
		colors: ['red'],
		attack: 10,
		description: 'If Eldritch Blast (https://www.notion.so/Eldritch-Blast-3892a7ae6830411da392903c16ea5271?pvs=21) is in play on your side of the field, add +10 Attack to Eldritch Blast',
		effects: {},
	},
	{
		id: '72',
		name: 'Blessed Blast',
		type: 'spell',
		colors: ['blue'],
		attack: 10,
		description: 'If attacking with Eldritch Blast (https://www.notion.so/Eldritch-Blast-3892a7ae6830411da392903c16ea5271?pvs=21),   Draw 2',
		effects: {},
	},
	{
		id: '73',
		name: 'Leeching Blast',
		type: 'spell',
		colors: ['green'],
		attack: 10,
		description: 'If you successfully damaged an enemy using Eldritch Blast (https://www.notion.so/Eldritch-Blast-3892a7ae6830411da392903c16ea5271?pvs=21) , heal 20hp',
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
		description: 'If attacking with “Bokutou”, add 7X to the attack where X is the number of “Form” cards you have active.',
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
		id: '87',
		name: 'Red Orb',
		type: 'spell',
		colors: ['red'],
		attack: 11,
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
		effects: {},
	},
	{
		id: '89',
		name: 'Green Orb',
		type: 'spell',
		colors: ['green'],
		attack: 11,
		description: 'When cast on top of another orb, Heals 20 HP',
		effects: {},
	},
	{
		id: '90',
		name: 'Purple Orb',
		type: 'spell',
		colors: ['blue', 'red'],
		attack: 11,
		description: 'When cast on top of another orb, discard the current field effect',
		effects: {},
	},
	{
		id: '91',
		name: 'Brown Orb',
		type: 'spell',
		colors: ['green', 'red'],
		attack: 11,
		description: 'When cast on top of another orb, choose a stack colour, and remove the top of that opponent’s stack.',
		effects: {},
	},
	{
		id: '92',
		name: 'Yellow Orb',
		type: 'spell',
		colors: ['blue', 'green'],
		attack: 11,
		description: 'When cast on top of another orb, deals 10 damage to the opponent',
		effects: {},
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
			'All “Dull” spells get +5 Attack. If successfully damaged with a “Dull” spell, your opponent takes 2X damage where X is the number of “Dull” spells you control',
		effects: {},
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
		description: 'You must have at least 3 cards in your hand to play this card. When this card is revealed, discard 2 cards from your hand.',
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
		description: 'All spells have 2x attack. After each combat, each player chooses a stack and removes that spell from play. If no spells are removed from play this way, discard Raise the Stakes.',
		effects: {},
	},
	{
		id: '107',
		name: 'Hex',
		type: 'spell',
		colors: [],
		attack: 10,
		description: 'After successfully dealing damage with this card, choose one of your opponent\'s stacks. Place this card on top of that stack.',
		effects: {},
	},
];
