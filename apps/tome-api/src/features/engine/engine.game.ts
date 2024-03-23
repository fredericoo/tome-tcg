import { DistributiveOmit } from '../../lib/type-utils';
import { invariant, noop, pill } from '../../lib/utils';
import { Board, initialiseGameBoard, moveTopCard, topOf } from './engine.board';
import { createHookActions } from './engine.hook.actions';
import { TurnHooks, createTriggerHooks } from './engine.hooks';
import { initialiseTurn } from './engine.turn';
import { PlayerActionMap } from './engine.turn.actions';

export type Side = 'sideA' | 'sideB';
export const SIDES = ['sideA', 'sideB'] as const satisfies Side[];

type SpellColor = 'red' | 'green' | 'blue';

type BaseCard = {
	key: number;
	id: string;
	name: string;
	description: string;
};

export interface SpellCard extends BaseCard {
	type: 'spell';
	name: string;
	colors: SpellColor[];
	attack: number;
	heal?: number;
	effects: Partial<TurnHooks<true>>;
}

export interface FieldCard extends BaseCard {
	type: 'field';
	name: string;
	color: SpellColor | null;
	effects: Partial<TurnHooks>;
}

export type GameCard = SpellCard | FieldCard;

// TODO: reference this from the drizzle model
export type DbCard = DistributiveOmit<GameCard, 'key'>;

export const STACKS = ['red', 'green', 'blue'] as const satisfies SpellStack[];
export type SpellStack = 'red' | 'green' | 'blue';

export type GameAction = {
	[A in keyof PlayerActionMap]: {
		type: A;
		config: PlayerActionMap[A]['config'];
		submit: PlayerActionMap[A]['onAction'];
		timesOutAt: number;
		requestedAt: number;
	};
}[keyof PlayerActionMap];

export type GameIterationResponse = {
	board: Board;
	/** Highlighted card keys */
	highlights: {
		positive: Set<number>;
		negative: Set<number>;
		effect: Set<number>;
	};
	arrows: Array<{
		from: GameCard;
		to: GameCard;
	}>;
	actions: {
		[K in Side]?: GameAction;
	};
};

export type Turn = {
	finishedTurns: Turn[];
	draws: Record<Side, GameCard[]>;
	casts: Record<Side, Record<SpellStack, SpellCard[]> & { field: FieldCard[] }>;
	spells: Record<Side, { slot: SpellStack; card: SpellCard | null } | undefined>;
	extraDamage: Record<Side, number>;
};

const winnerColorMap: Record<SpellColor, SpellColor> = {
	blue: 'red',
	green: 'blue',
	red: 'green',
};

const resolveFieldClash = (
	players: Board['players'],
): Partial<Record<'won' | 'lost', { side: Side; card: FieldCard }>> => {
	const [cardA, cardB] = [players.sideA.casting.field, players.sideB.casting.field];
	// vs no card
	if (!cardA && !cardB) return {};
	if (!cardA) return { won: { side: 'sideB', card: cardB! } };
	if (!cardB) return { won: { side: 'sideA', card: cardA } };

	// vs neutral
	if (!cardA.color && !cardB.color) return {};
	if (!cardB.color) return { won: { side: 'sideA', card: cardA }, lost: { side: 'sideB', card: cardB } };
	if (!cardA.color) return { won: { side: 'sideB', card: cardA }, lost: { side: 'sideA', card: cardB } };

	// vs card
	if (winnerColorMap[cardA.color] === cardB.color)
		return { won: { side: 'sideA', card: cardA }, lost: { side: 'sideB', card: cardB } };
	if (winnerColorMap[cardB.color] === cardA.color)
		return { won: { side: 'sideB', card: cardB }, lost: { side: 'sideA', card: cardA } };

	throw new Error(`Failed resolving winner field between “${cardA.name}” and “${cardB.name}”`);
};

const resolveSpellClash = (spells: Turn['spells']): { won: Side | null } => {
	if (!spells.sideA && !spells.sideB) return { won: null };
	if (!spells.sideA) return { won: 'sideB' };
	if (!spells.sideB) return { won: 'sideA' };

	if (spells.sideA.slot === spells.sideB.slot) return { won: null };
	if (winnerColorMap[spells.sideA.slot].includes(spells.sideB.slot)) return { won: 'sideA' };
	if (winnerColorMap[spells.sideB.slot].includes(spells.sideA.slot)) return { won: 'sideB' };

	throw new Error(`Failed resolving winner spell between “${spells.sideA.slot}” and “${spells.sideB.slot}”`);
};

export const createGameInstance = ({
	decks,
	settings,
}: {
	decks: Record<Side, DbCard[]>;
	settings: { castTimeoutMs: number; spellTimeoutMs: number; startingCards: number; emptySlotAttack: number };
}) => {
	const finishedTurns: Turn[] = [];
	const board = initialiseGameBoard({ decks });
	const game: GameIterationResponse = {
		board,
		actions: {},
		highlights: { effect: new Set(), negative: new Set(), positive: new Set() },
		arrows: [],
	};
	const triggerHook = createTriggerHooks(game);
	const actions = createHookActions(game);

	const drawCard = (side: Side, turn: Pick<Turn, 'draws'>) => {
		const draw = moveTopCard(board.players[side].drawPile, board.players[side].hand);
		if (draw.card) {
			turn.draws[side].push(draw.card);
		}
	};

	async function* handleTurn(): AsyncGenerator<GameIterationResponse> {
		const turn = initialiseTurn({ finishedTurns });
		yield game;

		// if first turn, draw cards
		if (finishedTurns.length === 0) {
			for (let i = 0; i < settings.startingCards; i++) {
				SIDES.forEach(side => drawCard(side, turn));
				yield game;
			}
		}

		yield* triggerHook({ hookName: 'beforeDraw', context: { actions, game, turn } });
		board.phase = 'draw';
		yield game;
		SIDES.forEach(side => drawCard(side, turn));
		yield game;

		yield* triggerHook({ hookName: 'beforeCast', context: { actions, game, turn } });
		board.phase = 'cast';
		yield game;

		// Spooky cast from hand action with multi-threading state LOL
		yield* actions.playerAction({
			sides: ['sideA', 'sideB'],
			timeoutMs: settings.castTimeoutMs,
			onTimeout: noop,
			action: {
				type: 'select_from_hand',
				config: { type: 'any', min: 1, max: 1, from: 'self' },
				onAction: async function* ({ side, cardKeys }) {
					const cardKey = cardKeys[0];
					invariant(cardKey !== undefined, 'No card key provided');

					const hand = board.players[side].hand;
					const index = hand.findIndex(handCard => handCard.key === cardKey);
					const card = hand[index];
					invariant(index !== -1 && card, `Card key “${cardKey}” not found in ${side}’s hand`);

					if (card.type === 'field') {
						hand.splice(index, 1);
						board.players[side].casting.field = card;
						turn.casts[side].field.push(card);
						return;
					}

					if (card.colors.length === 1) {
						// cast to the card’s colour
						const stack = card.colors[0];
						invariant(stack, `Card “${card.name}” has undefined color`);
						hand.splice(index, 1);
						board.players[side].casting[stack] = card;
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
								config: { availableStacks: stacks, min: 1, max: 1, from: 'self' },
								onAction: function* ({ stacks, side }) {
									const stack = stacks[0];
									invariant(stack, 'Expected exactly one stack');
									hand.splice(index, 1);
									board.players[side].casting[stack] = card;
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

		yield* triggerHook({ hookName: 'beforeReveal', context: { actions, game, turn } });
		board.phase = 'reveal';
		yield game;

		// Reveals spells cast and moves them into the slots
		for (const side of SIDES) {
			for (const stack of STACKS) {
				const castCards = turn.casts[side][stack];
				board.players[side].stacks[stack].push(...castCards);
				board.players[side].casting[stack] = undefined;
				yield game;
				for (const card of castCards) {
					if (card.effects.onReveal) {
						yield* card.effects.onReveal({
							actions,
							game,
							turn,
							opponentSide: side === 'sideA' ? 'sideB' : 'sideA',
							ownerSide: side,
						});
					}
				}
			}
		}

		/** Field card resolution */
		const fieldClash = resolveFieldClash(board.players);
		// only resolve if there was a clash
		if (fieldClash.lost || fieldClash.won) {
			if (fieldClash.won) {
				game.highlights.positive.add(fieldClash.won.card.key);
				board.field.push(fieldClash.won.card);
				board.players[fieldClash.won.side].casting.field = undefined;
			}
			if (fieldClash.lost) {
				game.highlights.negative.add(fieldClash.lost.card.key);
				board.players[fieldClash.lost.side].discardPile.push(fieldClash.lost.card);
				board.players[fieldClash.lost.side].casting.field = undefined;
			}
			yield game;
			if (fieldClash.won) game.highlights.positive.delete(fieldClash.won.card.key);
			if (fieldClash.lost) game.highlights.positive.delete(fieldClash.lost.card.key);
			yield game;
		}

		yield* triggerHook({ hookName: 'beforeSpell', context: { actions, game, turn } });
		board.phase = 'spell';
		yield game;

		yield* actions.playerAction({
			sides: ['sideA', 'sideB'],
			action: {
				type: 'select_spell_stack',
				config: { availableStacks: STACKS, min: 1, max: 1, from: 'self' },
				onAction: function* ({ stacks, side }) {
					const stack = stacks[0];
					invariant(stack, 'Expected exactly one stack');
					const cardToUse = topOf(board.players[side].stacks[stack]);
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

		yield* triggerHook({ hookName: 'beforeCombat', context: { actions, game, turn } });
		const spellClash = resolveSpellClash(turn.spells);
		const damage =
			spellClash.won ? turn.spells[spellClash.won]?.card?.attack ?? settings.emptySlotAttack : settings.emptySlotAttack;
		if (spellClash.won && damage > 0) {
			const losingSide = spellClash.won === 'sideA' ? 'sideB' : 'sideA';
			yield* actions.damage({ side: losingSide, amount: damage });
			const cardDamageHook = turn.spells[spellClash.won]?.card?.effects.onDealDamage;
			if (cardDamageHook) {
				console.log(
					pill('gray', turn.spells[spellClash.won]?.card?.name),
					'’s effect triggered by',
					pill('yellow', 'onDealDamage'),
					'hook.',
				);
				yield* cardDamageHook({ actions, game, turn, ownerSide: spellClash.won, opponentSide: losingSide });
			}
		}
		yield game;
		yield* triggerHook({ hookName: 'afterCombat', context: { actions, game, turn } });

		// end of turn
		finishedTurns.push(turn);
		yield* handleTurn();
	}

	return handleTurn();
};
