import { delay, invariant, noop, pill } from '../../lib/utils';
import { Board, topOf } from './engine.board';
import {
	GameIterationResponse,
	GameSettings,
	SIDES,
	STACKS,
	Turn,
	resolveFieldClash,
	resolveSpellClash,
} from './engine.game';
import { useGameActions } from './engine.hook.actions';
import { useTriggerHooks } from './engine.hooks';

export const getTurnCastCards = (casts: Turn['casts']) =>
	[casts.sideA.field, casts.sideB.field, ...SIDES.flatMap(side => STACKS.flatMap(stack => casts[side][stack]))].filter(
		Boolean,
	);

export const initialiseTurn = ({ finishedTurns }: { finishedTurns: Turn[] }): Turn => ({
	draws: { sideA: [], sideB: [] },
	casts: { sideA: { blue: [], green: [], red: [], field: [] }, sideB: { blue: [], green: [], red: [], field: [] } },
	finishedTurns,
	spells: { sideA: undefined, sideB: undefined },
	extraDamage: { sideA: 0, sideB: 0 },
});

type HandleTurnParmas = {
	game: GameIterationResponse;
	finishedTurns: Turn[];
	settings: GameSettings;
};
export async function* handleTurn(params: HandleTurnParmas): AsyncGenerator<GameIterationResponse> {
	const { game, finishedTurns, settings } = params;
	const { triggerTurnHook } = useTriggerHooks(game);
	const actions = useGameActions(game);
	const turn = initialiseTurn({ finishedTurns });
	yield game;

	async function* setPhase(phase: Board['phase']) {
		game.board.phase = phase;
		yield game;
		await delay(settings.phaseDelayMs);
	}

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
					turn.casts[side].field.push(card);
					return;
				}

				if (card.colors.length === 1) {
					// cast to the card’s colour
					const stack = card.colors[0];
					invariant(stack, `Card “${card.name}” has undefined color`);
					hand.splice(index, 1);
					game.board.players[side].casting[stack] = card;
					turn.casts[side][stack].push(card);
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
								turn.casts[side][stack].push(card);
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
			const castCards = turn.casts[side][stack];
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
		const fieldCard = turn.casts[side].field[0];
		if (fieldCard && fieldCard.effects.onReveal) {
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
	/** Field card resolution */
	const fieldClash = resolveFieldClash(game.board.players);
	// only resolve if there was a clash
	if (fieldClash.lost || fieldClash.won) {
		if (fieldClash.won) {
			game.highlights.positive.add(fieldClash.won.card.key);
			game.board.field.push(fieldClash.won.card);
			game.board.players[fieldClash.won.side].casting.field = undefined;
		}
		if (fieldClash.lost) {
			game.highlights.negative.add(fieldClash.lost.card.key);
			game.board.players[fieldClash.lost.side].discardPile.push(fieldClash.lost.card);
			game.board.players[fieldClash.lost.side].casting.field = undefined;
			yield game;
		}
		if (fieldClash.won) {
			game.highlights.positive.delete(fieldClash.won.card.key);
			const wonEffect = fieldClash.won.card.effects.onClashWin;
			if (wonEffect)
				yield* wonEffect({
					actions,
					game,
					ownerSide: undefined,
					opponentSide: undefined,
					thisCard: fieldClash.won.card,
					loserCard: fieldClash.lost?.card,
					turn,
					winnerSide: fieldClash.won.side,
				});
		}
		if (fieldClash.lost) {
			game.highlights.positive.delete(fieldClash.lost.card.key);
			const lostEffect = fieldClash.lost.card.effects.onClashLose;
			if (lostEffect)
				yield* lostEffect({
					actions,
					game,
					ownerSide: undefined,
					opponentSide: undefined,
					thisCard: fieldClash.lost.card,
					winnerCard: fieldClash.won?.card,
					turn,
					loserSide: fieldClash.lost.side,
				});
		}
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
				turn.spells[side] = {
					slot: stack,
					card: cardToUse ?? null,
				};
				yield game;
			},
		},
		timeoutMs: settings.spellTimeoutMs,
		onTimeout: noop,
	});

	yield* triggerTurnHook({ hookName: 'beforeCombat', context: { actions, game, turn } });
	yield* setPhase('combat');

	const spellClash = resolveSpellClash(turn.spells);
	if (spellClash.won) {
		let damage = turn.spells[spellClash.won]?.card?.attack ?? settings.emptySlotAttack;
		damage += turn.extraDamage[spellClash.won];
		const healing = turn.spells[spellClash.won]?.card?.heal ?? 0;

		const losingSide = spellClash.won === 'sideA' ? 'sideB' : 'sideA';
		if (damage > 0) {
			yield* actions.damagePlayer({ side: losingSide, amount: damage });
			const cardToDealDamage = turn.spells[spellClash.won]?.card;
			if (cardToDealDamage) {
				const cardDamageHook = cardToDealDamage.effects.onDealDamage;
				if (cardDamageHook) {
					console.log(
						pill('gray', turn.spells[spellClash.won]?.card?.name),
						'’s effect triggered by',
						pill('yellow', 'onDealDamage'),
						'hook.',
					);
					yield* cardDamageHook({
						actions,
						game,
						turn,
						ownerSide: spellClash.won,
						opponentSide: losingSide,
						thisCard: cardToDealDamage,
					});
				}
			}
		}
		if (healing > 0) {
			yield* actions.healPlayer({ side: spellClash.won, amount: healing });
		}
	}
	yield game;
	yield* triggerTurnHook({ hookName: 'afterCombat', context: { actions, game, turn } });

	// end of turn
	finishedTurns.push(turn);
	yield* handleTurn(params);
}
