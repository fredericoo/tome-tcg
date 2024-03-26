import { delay, exhaustive, invariant, noop } from '../../lib/utils';
import { resolveCombatValue } from '../card/card.fns.utils';
import { Board, topOf } from './engine.board';
import {
	CombatStackItem,
	GameIterationResponse,
	GameSettings,
	SIDES,
	STACKS,
	Side,
	Turn,
	resolveFieldClash,
	resolveSpellClash,
} from './engine.game';
import { useGameActions } from './engine.hook.actions';
import { useTriggerHooks } from './engine.hooks';

const initialiseTurnSide = (): Turn[Side] => ({
	draws: [],
	casts: { blue: [], green: [], red: [], field: [] },
	spellAttack: undefined,
});

export const initialiseTurn = ({
	finishedTurns,
	game,
	settings,
}: {
	finishedTurns: Turn[];
	game: GameIterationResponse;
	settings: Pick<GameSettings, 'phaseDelayMs'>;
}) => {
	const turn: Turn = {
		finishedTurns,
		combatStack: [],
		sideA: initialiseTurnSide(),
		sideB: initialiseTurnSide(),
	};

	return {
		turn,
		setPhase: async function* setPhase(phase: Board['phase']) {
			game.board.phase = phase;
			yield game;
			await delay(settings.phaseDelayMs);
		},
	};
};

type HandleTurnParmas = {
	game: GameIterationResponse;
	finishedTurns: Turn[];
	settings: GameSettings;
};
export async function* handleTurn(params: HandleTurnParmas): AsyncGenerator<GameIterationResponse> {
	const { game, finishedTurns, settings } = params;
	const { triggerTurnHook } = useTriggerHooks(game);
	const actions = useGameActions(game);
	const { turn, setPhase } = initialiseTurn({ finishedTurns, game, settings });
	game.turn = turn;
	yield game;

	// if first turn, draw cards
	if (finishedTurns.length === 0) {
		for (let i = 0; i < settings.startingCards; i++) {
			yield* actions.draw({ sides: ['sideA', 'sideB'] });
		}
	}

	yield* triggerTurnHook({ hookName: 'beforeDraw', context: { actions, game, turn } });
	yield* setPhase('draw');
	yield* actions.draw({ sides: ['sideA', 'sideB'] });

	yield* triggerTurnHook({ hookName: 'beforeCast', context: { actions, game, turn } });
	yield* setPhase('cast');
	// Spooky cast from hand action with multi-threading state LOL
	yield* actions.playerAction({
		sides: ['sideA', 'sideB'],
		timeoutMs: settings.castTimeoutMs,
		onTimeout: noop,
		action: {
			type: 'select_from_hand',
			config: { type: 'any', min: 1, max: 1, from: 'self', message: 'Select a card to cast' },
			onAction: async function* ({ side, cardKeys }) {
				const cardKey = cardKeys[0];
				invariant(cardKey !== undefined, 'No card key provided');

				const hand = game.board.players[side].hand;
				const index = hand.findIndex(handCard => handCard.key === cardKey);
				const card = hand[index];
				invariant(index !== -1 && card, `Card key “${cardKey}” not found in ${side}’s hand`);

				if (card.type === 'field') {
					hand.splice(index, 1);
					game.board.players[side].casting.field = card;
					turn[side].casts.field.push(card);
					return;
				}

				if (card.colors.length === 1) {
					// cast to the card’s colour
					const stack = card.colors[0];
					invariant(stack, `Card “${card.name}” has undefined color`);
					hand.splice(index, 1);
					game.board.players[side].casting[stack] = card;
					turn[side].casts[stack].push(card);
					yield game;
					return;
				}
				if (card.colors.length !== 1) {
					// if no color, cast to any stack
					const stacks = card.colors.length > 0 ? card.colors : STACKS;

					yield* actions.playerAction({
						sides: [side],
						onTimeout: noop,
						timeoutMs: 100000,
						action: {
							type: 'select_spell_stack',
							config: {
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
								turn[side].casts[stack].push(card);
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

	yield* triggerTurnHook({ hookName: 'beforeReveal', context: { actions, game, turn } });
	yield* setPhase('reveal');

	// Reveals spells cast and moves them into the slots
	for (const side of SIDES) {
		for (const stack of STACKS) {
			const castCards = turn[side].casts[stack];
			for (const card of castCards) {
				if (card.effects.onReveal) {
					yield* card.effects.onReveal({
						actions,
						game,
						turn,
						opponentSide: side === 'sideA' ? 'sideB' : 'sideA',
						ownerSide: side,
						thisCard: card,
					});
				}
			}
			game.board.players[side].stacks[stack].push(...castCards);
			game.board.players[side].casting[stack] = undefined;
			yield game;
		}
	}

	// trigger onReveal for field cards
	for (const side of SIDES) {
		for (const fieldCard of turn[side].casts.field) {
			if (fieldCard.effects.onReveal) {
				yield* fieldCard.effects.onReveal({
					actions,
					game,
					turn,
					opponentSide: undefined,
					ownerSide: undefined,
					thisCard: fieldCard,
				});
			}
		}
	}
	/** Field card resolution */
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
		if (winnerCard) {
			game.highlights.positive.add(winnerCard.key);
			game.board.field.push(winnerCard);
			game.board.players[winnerSide].casting.field = undefined;
		}
		if (loserCard) {
			game.highlights.negative.add(loserCard.key);
			game.board.players[loserSide].discardPile.push(loserCard);
			game.board.players[loserSide].casting.field = undefined;
		}
		yield game;

		const winnerEffect = winnerCard?.effects.onClashWin;
		const loserEffect = loserCard?.effects.onClashLose;
		if (winnerEffect)
			yield* winnerEffect({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: winnerCard,
				loserCard,
				turn,
				winnerSide,
			});

		if (loserEffect)
			yield* loserEffect({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: loserCard,
				winnerCard,
				turn,
				loserSide: loserSide,
			});
		yield game;
	}

	yield* triggerTurnHook({ hookName: 'beforeSpell', context: { actions, game, turn } });
	yield* setPhase('spell');

	yield* actions.playerAction({
		sides: ['sideA', 'sideB'],
		action: {
			type: 'select_spell_stack',
			config: {
				availableStacks: STACKS,
				min: 1,
				max: 1,
				from: 'self',
				message: 'Select a stack to attack with spell',
			},
			onAction: function* ({ stacks, side }) {
				const stack = stacks[0];
				invariant(stack, 'Expected exactly one stack');
				const cardToUse = topOf(game.board.players[side].stacks[stack]);
				turn[side].spellAttack = {
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
	yield* triggerTurnHook({ hookName: 'beforeCombat', context: { actions, game, turn } });
	yield* setPhase('combat');
	const spellClash = resolveSpellClash({ spellA: turn.sideA.spellAttack, spellB: turn.sideB.spellAttack });

	if (spellClash.won) {
		const winnerSide = spellClash.won;
		const loserSide = winnerSide === 'sideA' ? 'sideB' : 'sideA';
		const winnerCard = turn[winnerSide].spellAttack?.card ?? null;

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
			turn.combatStack.push({
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
			turn.combatStack.push({
				source: winnerCard,
				target: winnerSide,
				type: 'heal',
				value: healFromCard,
			});
		}
		yield game;

		/**
		 * DAMAGE PHASE
		 * - resolve combat stacks
		 * - trigger hooks for damage */
		yield* triggerTurnHook({ hookName: 'beforeDamage', context: { actions, game, turn } });
		yield* setPhase('damage');
		for (const combatItem of turn.combatStack) {
			switch (combatItem.type) {
				case 'damage':
					yield* resolveCombatDamage(actions, combatItem, game, turn);
					break;
				case 'heal':
					yield* resolveCombatHealing(actions, combatItem, game, turn);
					break;
				default:
					exhaustive(combatItem);
			}
		}

		yield* triggerTurnHook({ hookName: 'afterDamage', context: { actions, game, turn } });

		// end of turn
		finishedTurns.push(turn);
		yield* handleTurn(params);
	}

	async function* resolveCombatDamage(
		actions: ReturnType<typeof useGameActions>,
		combatItem: CombatStackItem & { type: 'damage' },
		game: GameIterationResponse,
		turn: Turn,
	) {
		yield* actions.damagePlayer({ side: combatItem.target, amount: combatItem.value });
		switch (combatItem.source?.type) {
			case 'field': {
				const onDamage = combatItem.source.effects.onDealDamage;
				if (!onDamage) break;
				yield* onDamage({
					actions,
					game,
					turn,
					ownerSide: undefined,
					opponentSide: undefined,
					thisCard: combatItem.source,
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
						turn,
						ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
						opponentSide: combatItem.target,
						thisCard: combatItem.source,
					});
				}
				break;
			default:
		}
	}

	async function* resolveCombatHealing(
		actions: ReturnType<typeof useGameActions>,
		combatItem: CombatStackItem & { type: 'heal' },
		game: GameIterationResponse,
		turn: Turn,
	) {
		yield* actions.healPlayer({ side: combatItem.target, amount: combatItem.value });
		switch (combatItem.source?.type) {
			case 'field': {
				const onHeal = combatItem.source.effects.onHeal;
				if (!onHeal) break;
				yield* onHeal({
					actions,
					game,
					turn,
					ownerSide: undefined,
					opponentSide: undefined,
					thisCard: combatItem.source,
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
						turn,
						ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
						opponentSide: combatItem.target,
						thisCard: combatItem.source,
					});
				}
				break;
			default:
		}
	}
}
