import { delay, exhaustive, invariant, noop } from '../../lib/utils';
import { resolveCombatValue } from '../card/card.utils';
import { removeCard, topOf } from './engine.board';
import {
	COLORS,
	CombatStackItem,
	FieldCard,
	GameCard,
	GameIteration,
	GameSettings,
	GameState,
	Side,
	SpellAttack,
	SpellCard,
	SpellColor,
	resolveFieldClash,
	resolveSpellClash,
	runClashEffects,
} from './engine.game';
import { useGameActions } from './engine.game.actions';
import { useTriggerHooks } from './engine.hooks';
import { log } from './engine.log';

const initialiseTurnSide = (): Turn[Side] => ({
	draws: [],
	spellAttack: undefined,
});

export type Turn = {
	phase: 'draw' | 'prepare' | 'reveal' | 'field-clash' | 'cast-spell' | 'spell-clash' | 'damage';
	combatStack: CombatStackItem[];
	prepared: Array<
		{ card: SpellCard; stack?: SpellColor; side: Side } | { card: FieldCard; stack?: 'field'; side: Side }
	>;
} & Record<
	Side,
	{
		draws: GameCard[];
		spellAttack: SpellAttack | undefined;
	}
>;

export const initialiseTurn = () => {
	const turn: Turn = {
		phase: 'draw',
		combatStack: [],
		prepared: [],
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

	async function* setPhase(phase: GameState['turn']['phase']) {
		game.turn.phase = phase;
		yield game;
		await delay(settings.phaseDelayMs);
	}

	yield game;
	yield log({
		type: 'log',
		text: `TURN ${game.finishedTurns.length + 1}`,
	});

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

	// Allows user to select from their hand to prepare
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
				for (const cardKey of cardKeys) {
					const card = game.board.players[side].hand.find(handCard => handCard.key === cardKey);
					if (!card) continue;
					switch (card.type) {
						case 'field':
							game.turn.prepared.push({ card, side });
							break;
						case 'spell':
							game.turn.prepared.push({ card, side });
					}
				}
				yield game;
			},
		},
	});

	// check each card being prepared and place them on the casting slots
	for (const preparing of game.turn.prepared) {
		const { card, side } = preparing;
		const indexInHand = game.board.players[side].hand.findIndex(handCard => handCard.key === card.key);
		if (indexInHand === -1) {
			game.turn.prepared.slice(game.turn.prepared.indexOf(preparing), 1);
			yield log({
				type: 'error',
				text: `“${card.name}” not found in {{player}}’s hand`,
				dynamic: { player: { type: 'player', side } },
			});
			continue;
		}

		if (card.type === 'field') {
			game.board.players[side].hand.splice(indexInHand, 1);
			game.board.players[side].casting.field.push(card);
			preparing.stack = 'field';
			yield game;
			continue;
		}

		if (card.colors.length === 1) {
			// cast to the card’s first and only colour
			const stack = card.colors[0];
			invariant(stack, `Card “${card.name}” has invalid color`);
			game.board.players[side].hand.splice(indexInHand, 1);

			game.board.players[side].casting[stack].push(card);
			preparing.stack = stack;
			yield game;
			continue;
		}

		if (card.colors.length !== 1) {
			// if no color, cast to any stack
			const stacks = card.colors.length > 0 ? card.colors : COLORS;

			yield* actions.playerAction({
				sides: [side],
				onTimeout: noop,
				timeoutMs: settings.castTimeoutMs,
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
						game.board.players[side].hand.splice(indexInHand, 1);
						game.board.players[side].casting[stack].push(card);
						preparing.stack = stack;
						yield game;
					},
				},
			});
		}
	}

	yield* triggerTurnHook({ hookName: 'beforeReveal', context: { actions, game } });
	yield* setPhase('reveal');

	const preparedFieldCards = game.turn.prepared.filter((p): p is typeof p & { stack: 'field' } => p.stack === 'field');
	const preparedSpellCards = game.turn.prepared.filter(
		(p): p is typeof p & { stack: SpellColor } => p.stack !== undefined && COLORS.includes(p.stack),
	);
	// Reveals spells cast and moves them into the slots
	for (const { card, side, stack } of preparedSpellCards) {
		yield log({
			type: 'log',
			text: `{{player}} reveals they’ll prepare {{card}} to the ${stack} stack.`,
			dynamic: { player: { type: 'player', side }, card: { type: 'card', card } },
		});
		if (card.effects.onReveal) {
			yield* card.effects.onReveal({
				actions,
				game,
				opponentSide: side === 'sideA' ? 'sideB' : 'sideA',
				ownerSide: side,
				thisCard: card,
				thisStack: stack,
			});
		}
	}

	for (const { card, side, stack } of preparedFieldCards) {
		yield log({
			type: 'log',
			text: `{{player}} reveals they’ll prepare {{card}} to the ${stack} stack.`,
			dynamic: { player: { type: 'player', side }, card: { type: 'card', card } },
		});
		if (card.effects.onReveal) {
			yield* card.effects.onReveal({
				actions,
				game,
				opponentSide: undefined,
				ownerSide: undefined,
				thisCard: card,
				thisStack: 'field',
			});
		}
	}

	yield* setPhase('field-clash');
	while (game.board.players.sideA.casting.field.length > 0 || game.board.players.sideB.casting.field.length > 0) {
		const topField = {
			sideA: topOf(game.board.players.sideA.casting.field),
			sideB: topOf(game.board.players.sideB.casting.field),
		};
		const fieldClash = resolveFieldClash({
			cardA: topField.sideA,
			cardB: topField.sideB,
		});
		// only resolve if there was a clash
		if (fieldClash.won !== null) {
			const winnerSide = fieldClash.won;
			const loserSide = winnerSide === 'sideA' ? 'sideB' : 'sideA';
			const winnerCard = topField[winnerSide];
			const loserCard = topField[loserSide];

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

			if (winnerCard && loserCard) {
				yield log({
					type: 'log',
					text: '{{winner}}’s {{winner_card}} field wins the clash against {{loser}}’s {{loser_card}} field.',
					dynamic: {
						winner: { type: 'player', side: winnerSide },
						winner_card: { type: 'card', card: winnerCard },
						loser: { type: 'player', side: loserSide },
						loser_card: { type: 'card', card: loserCard },
					},
				});
			}

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

			if (winnerCard) yield* actions.moveTopCard(game.board.players[winnerSide].casting.field, game.board.field);
			if (loserCard) yield* actions.discard(loserCard);
		} else {
			// if no winner, discard both cards
			if (topField.sideA) yield* actions.discard(topField.sideA);
			if (topField.sideB) yield* actions.discard(topField.sideB);
		}
	}

	for (const { card, side, stack } of preparedSpellCards) {
		const cardToMove = removeCard(game.board.players[side].casting[stack], card);
		if (!cardToMove || cardToMove.type !== 'spell') {
			yield log({
				type: 'error',
				text: `Card “${card.name}” not found in {{player}}’s casting ${stack} stack.`,
				dynamic: { player: { type: 'player', side } },
			});
			continue;
		}
		game.board.players[side].stacks[stack].push(cardToMove);
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

		yield log({
			type: 'log',
			text: `${game.turn[winnerSide].spellAttack?.slot} beats ${
				game.turn[loserSide].spellAttack?.slot ?? 'nothing'
			}! {{winner}} wins the spell clash against {{loser}}.`,
			dynamic: {
				winner: { type: 'player', side: winnerSide },
				loser: { type: 'player', side: loserSide },
			},
		});

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
	} else {
		yield log({
			type: 'log',
			text: 'Draw! Both spells cancel each other out.',
		});
	}

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
				thisStack: 'field',
			});
			break;
		}
		case 'spell':
			{
				const card = combatItem.source;
				const onDamage = combatItem.source.effects.onDealDamage;
				if (!onDamage) break;
				yield* onDamage({
					actions,
					game,
					ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
					opponentSide: combatItem.target,
					thisCard: card,
					thisStack: COLORS.find(stack => game.board.players[combatItem.target].stacks[stack].includes(card)),
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
				thisStack: 'field',
			});
			break;
		}
		case 'spell':
			{
				const card = combatItem.source;
				const onHeal = card.effects.onHeal;
				if (!onHeal) break;
				yield* onHeal({
					actions,
					game,
					ownerSide: combatItem.target === 'sideA' ? 'sideB' : 'sideA',
					opponentSide: combatItem.target,
					thisCard: card,
					thisStack: COLORS.find(stack => game.board.players[combatItem.target].stacks[stack].includes(card)),
				});
			}
			break;
		default:
	}
}
