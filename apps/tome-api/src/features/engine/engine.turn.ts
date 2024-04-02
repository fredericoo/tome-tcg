import { delay, exhaustive, invariant, noop } from '../../lib/utils';
import { resolveCombatValue } from '../card/card.fns.utils';
import { Board, topOf } from './engine.board';
import {
	COLORS,
	CombatStackItem,
	GameIteration,
	GameSettings,
	GameState,
	SIDES,
	Side,
	Turn,
	resolveFieldClash,
	resolveSpellClash,
	runClashEffects,
} from './engine.game';
import { useGameActions } from './engine.hook.actions';
import { getCardEffectHighlight, useTriggerHooks } from './engine.hooks';

const initialiseTurnSide = (): Turn[Side] => ({
	draws: [],
	casts: { blue: [], green: [], red: [], field: [] },
	spellAttack: undefined,
});

export const initialiseTurn = () => {
	const turn: Turn = {
		combatStack: [],
		sideA: initialiseTurnSide(),
		sideB: initialiseTurnSide(),
	};

	return turn;
};

type HandleTurnParmas = {
	game: GameState;
	settings: GameSettings;
};
export async function* handleTurn(params: HandleTurnParmas): AsyncGenerator<GameIteration> {
	const { game, settings } = params;
	const { triggerTurnHook } = useTriggerHooks(game);
	const actions = useGameActions(game);

	async function* setPhase(phase: Board['phase']) {
		game.board.phase = phase;
		yield game;
		await delay(settings.phaseDelayMs);
	}

	yield game;

	// if first turn, draw cards
	if (game.finishedTurns.length === 0) {
		for (let i = 0; i < settings.startingCards; i++) {
			yield* actions.draw({ sides: ['sideA', 'sideB'] });
		}
	}

	yield* triggerTurnHook({ hookName: 'beforeDraw', context: { actions, game } });
	yield* setPhase('draw');
	yield* actions.draw({ sides: ['sideA', 'sideB'] });

	yield* triggerTurnHook({ hookName: 'beforeCast', context: { actions, game } });
	yield* setPhase('prepare');
	// Spooky cast from hand action with multi-threading state LOL
	yield* actions.playerAction({
		sides: ['sideA', 'sideB'],
		timeoutMs: settings.castTimeoutMs,
		onTimeout: noop,
		action: {
			type: 'select_from_hand',
			config: {
				min: 0,
				max: 1,
				from: 'self',
				message: 'Prepare a spell or field',
				availableColors: COLORS,
				availableTypes: ['field', 'spell'],
			},
			onAction: async function* ({ side, cardKeys }) {
				const cardKey = cardKeys[0];
				if (!cardKey) return;

				const hand = game.board.players[side].hand;
				const index = hand.findIndex(handCard => handCard.key === cardKey);
				const card = hand[index];
				invariant(index !== -1 && card, `Card key “${cardKey}” not found in ${side}’s hand`);

				if (card.type === 'field') {
					hand.splice(index, 1);
					game.board.players[side].casting.field = card;
					game.turn[side].casts.field.push(card);
					return;
				}

				if (card.colors.length === 1) {
					// cast to the card’s colour
					const stack = card.colors[0];
					invariant(stack, `Card “${card.name}” has undefined color`);
					hand.splice(index, 1);
					game.board.players[side].casting[stack] = card;
					game.turn[side].casts[stack].push(card);
					yield game;
					return;
				}
				if (card.colors.length !== 1) {
					// if no color, cast to any stack
					const stacks = card.colors.length > 0 ? card.colors : COLORS;

					yield* actions.playerAction({
						sides: [side],
						onTimeout: noop,
						timeoutMs: 100000,
						action: {
							type: 'select_spell_stack',
							config: {
								skippable: false,
								availableStacks: stacks,
								min: 1,
								max: 1,
								from: 'self',
								message: `Select a stack to cast “${card.name}” to.`,
							},
							onAction: function* ({ stacks, side }) {
								const stack = stacks[0];
								invariant(stack, 'Expected exactly one stack');
								hand.splice(index, 1);
								game.board.players[side].casting[stack] = card;
								game.turn[side].casts[stack].push(card);
								yield game;
							},
						},
					});
					return;
				}
				throw new Error(`Invalid cast ${card.name}`);
			},
		},
	});

	yield* triggerTurnHook({ hookName: 'beforeReveal', context: { actions, game } });
	yield* setPhase('reveal');

	// Reveals spells cast and moves them into the slots
	for (const side of SIDES) {
		for (const stack of COLORS) {
			const castCards = game.turn[side].casts[stack];
			for (const card of castCards) {
				if (card.effects.onReveal) {
					yield* card.effects.onReveal({
						actions,
						game,
						opponentSide: side === 'sideA' ? 'sideB' : 'sideA',
						ownerSide: side,
						thisCard: card,
						cardEffectHighlight: getCardEffectHighlight(card),
					});
				}
			}
			game.board.players[side].stacks[stack].push(...castCards);
			game.board.players[side].casting[stack] = undefined;
		}
	}
	yield game;

	// trigger onReveal for field cards
	for (const side of SIDES) {
		for (const fieldCard of game.turn[side].casts.field) {
			if (fieldCard.effects.onReveal) {
				yield* fieldCard.effects.onReveal({
					actions,
					game,
					opponentSide: undefined,
					ownerSide: undefined,
					thisCard: fieldCard,
					cardEffectHighlight: getCardEffectHighlight(fieldCard),
				});
			}
		}
	}

	yield* setPhase('field-clash');
	const fieldClash = resolveFieldClash({
		cardA: game.board.players.sideA.casting.field,
		cardB: game.board.players.sideB.casting.field,
	});
	// only resolve if there was a clash
	if (fieldClash.won !== null) {
		const winnerSide = fieldClash.won;
		const loserSide = winnerSide === 'sideA' ? 'sideB' : 'sideA';
		const winnerCard = game.board.players[winnerSide].casting.field;
		const loserCard = game.board.players[loserSide].casting.field;

		if (winnerCard)
			yield* actions.vfx({
				type: 'highlight',
				durationMs: settings.effectHighlightMs,
				config: { target: { type: 'card', cardKey: winnerCard.key }, type: 'positive' },
			});
		if (loserCard)
			yield* actions.vfx({
				type: 'highlight',
				durationMs: settings.effectHighlightMs,
				config: { target: { type: 'card', cardKey: loserCard.key }, type: 'negative' },
			});

		yield game;
		delay(1000);

		yield* runClashEffects({
			actions,
			game,
			winnerSide,
			loserSide,
			loserCard,
			winnerCard,
		});

		if (winnerCard) game.board.field.push(winnerCard);
		if (loserCard) game.board.discardPile.push(loserCard);
		game.board.players[winnerSide].casting.field = undefined;
		game.board.players[loserSide].casting.field = undefined;
		yield game;
	}

	yield* triggerTurnHook({ hookName: 'beforeSpell', context: { actions, game } });
	yield* setPhase('cast-spell');

	yield* actions.playerAction({
		sides: ['sideA', 'sideB'],
		action: {
			type: 'select_spell_stack',
			config: {
				skippable: false,
				availableStacks: COLORS,
				min: 1,
				max: 1,
				from: 'self',
				message: 'Attack with a spell',
			},
			onAction: function* ({ stacks, side }) {
				const stack = stacks[0];
				invariant(stack, 'Expected exactly one stack');
				const cardToUse = topOf(game.board.players[side].stacks[stack]);
				game.turn[side].spellAttack = {
					slot: stack,
					card: cardToUse ?? null,
				};
				yield game;
			},
		},
		timeoutMs: settings.spellTimeoutMs,
		onTimeout: noop,
	});

	/**
	 *  COMBAT PHASE
	 *  - Resolve spell clash
	 *  - Calculates damage
	 */
	yield* triggerTurnHook({ hookName: 'beforeCombat', context: { actions, game } });
	yield* setPhase('spell-clash');
	const spellClash = resolveSpellClash({ spellA: game.turn.sideA.spellAttack, spellB: game.turn.sideB.spellAttack });

	if (spellClash.won) {
		const winnerSide = spellClash.won;
		const loserSide = winnerSide === 'sideA' ? 'sideB' : 'sideA';
		const winnerCard = game.turn[winnerSide].spellAttack?.card ?? null;
		const loserCard = game.turn[loserSide].spellAttack?.card ?? null;

		if (winnerCard)
			yield* actions.vfx({
				type: 'highlight',
				durationMs: settings.effectHighlightMs,
				config: { target: { type: 'card', cardKey: winnerCard.key }, type: 'positive' },
			});
		if (loserCard)
			yield* actions.vfx({
				type: 'highlight',
				durationMs: settings.effectHighlightMs,
				config: { target: { type: 'card', cardKey: loserCard.key }, type: 'negative' },
			});

		const damageFromCard =
			winnerCard?.attack ?
				resolveCombatValue(winnerCard.attack, {
					game,
					opponentSide: loserSide,
					ownerSide: winnerSide,
					thisCard: winnerCard,
				})
			:	settings.emptySlotAttack;
		if (damageFromCard > 0) {
			game.turn.combatStack.push({
				source: winnerCard,
				target: loserSide,
				type: 'damage',
				value: damageFromCard,
			});
		}
		const healFromCard =
			winnerCard?.heal ?
				resolveCombatValue(winnerCard.heal, {
					game,
					opponentSide: loserSide,
					ownerSide: winnerSide,
					thisCard: winnerCard,
				})
			:	0;
		if (healFromCard > 0) {
			game.turn.combatStack.push({
				source: winnerCard,
				target: winnerSide,
				type: 'heal',
				value: healFromCard,
			});
		}
		yield game;

		yield* runClashEffects({
			actions,
			game,
			winnerSide,
			loserSide,
			loserCard,
			winnerCard,
		});

		/**
		 * DAMAGE PHASE
		 * - resolve combat stacks
		 * - trigger hooks for damage */
		yield* triggerTurnHook({ hookName: 'beforeDamage', context: { actions, game } });
		yield* setPhase('damage');
		for (const combatItem of game.turn.combatStack) {
			switch (combatItem.type) {
				case 'damage':
					yield* resolveCombatDamage(actions, combatItem, game);
					break;
				case 'heal':
					yield* resolveCombatHealing(actions, combatItem, game);
					break;
				default:
					exhaustive(combatItem);
			}
		}

		yield* triggerTurnHook({ hookName: 'afterDamage', context: { actions, game } });
	}

	// end of turn
	game.finishedTurns.push(game.turn);
	game.turn = initialiseTurn();
	yield* handleTurn(params);
}

async function* resolveCombatDamage(
	actions: ReturnType<typeof useGameActions>,
	combatItem: CombatStackItem & { type: 'damage' },
	game: GameState,
) {
	yield* actions.damagePlayer({ side: combatItem.target, amount: combatItem.value });
	switch (combatItem.source?.type) {
		case 'field': {
			const onDamage = combatItem.source.effects.onDealDamage;
			if (!onDamage) break;
			yield* onDamage({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: combatItem.source,
				cardEffectHighlight: getCardEffectHighlight(combatItem.source),
			});
			break;
		}
		case 'spell':
			{
				const onDamage = combatItem.source.effects.onDealDamage;
				if (!onDamage) break;
				yield* onDamage({
					actions,
					game,
					ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
					opponentSide: combatItem.target,
					thisCard: combatItem.source,
					cardEffectHighlight: getCardEffectHighlight(combatItem.source),
				});
			}
			break;
		default:
	}
}

async function* resolveCombatHealing(
	actions: ReturnType<typeof useGameActions>,
	combatItem: CombatStackItem & { type: 'heal' },
	game: GameState,
) {
	yield* actions.healPlayer({ side: combatItem.target, amount: combatItem.value });
	switch (combatItem.source?.type) {
		case 'field': {
			const onHeal = combatItem.source.effects.onHeal;
			if (!onHeal) break;
			yield* onHeal({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: combatItem.source,
				cardEffectHighlight: getCardEffectHighlight(combatItem.source),
			});
			break;
		}
		case 'spell':
			{
				const onHeal = combatItem.source.effects.onHeal;
				if (!onHeal) break;
				yield* onHeal({
					actions,
					game,
					ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
					opponentSide: combatItem.target,
					thisCard: combatItem.source,
					cardEffectHighlight: getCardEffectHighlight(combatItem.source),
				});
			}
			break;
		default:
	}
}
