import { DistributiveOmit } from '../../lib/type-utils';
import { invariant, noop } from '../../lib/utils';
import { Board, initialiseGameBoard, moveTopCard, topOf } from './engine.board';
import { createHookActions } from './engine.hook.actions';
import { TurnHooks, createTriggerHooks } from './engine.hooks';
import { initialiseTurn } from './engine.turn';
import { PlayerActionMap } from './engine.turn.actions';

export type Side = 'sideA' | 'sideB';
export const SIDES = ['sideA', 'sideB'] as const satisfies Side[];

type SpellColor = 'red' | 'green' | 'blue' | 'neutral';

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
	effects: Partial<TurnHooks<true>>;
}

export interface FieldCard extends BaseCard {
	type: 'field';
	name: string;
	color: SpellColor;
	effects: Partial<TurnHooks>;
}

export type GameCard = SpellCard | FieldCard;

// TODO: reference this from the drizzle model
export type DbCard = DistributiveOmit<GameCard, 'key'>;

export const STACKS = ['red', 'green', 'blue'] as const satisfies SpellStack[];
export type SpellStack = 'red' | 'green' | 'blue';

export type GameIterationResponse = {
	board: Board;
	highlights?: {
		positive?: GameCard[];
		negative?: GameCard[];
		effect?: GameCard[];
	};
	arrows?: Array<{
		from: GameCard;
		to: GameCard;
	}>;
	actions?: {
		[K in Side]?: {
			[A in keyof PlayerActionMap]: {
				type: A;
				config: PlayerActionMap[A]['config'];
				submit: PlayerActionMap[A]['onAction'];
				timesOutAt: number;
			};
		}[keyof PlayerActionMap];
	};
};

export type Turn = {
	finishedTurns: Turn[];
	draws: Record<Side, GameCard[]>;
	casts: Record<Side, Record<SpellStack, SpellCard[]> & { field: FieldCard[] }>;
	spells: Record<Side, { slot: SpellStack; card: SpellCard | null } | undefined>;
};

const winnerColorMap: Record<SpellColor, SpellColor[]> = {
	blue: ['red', 'neutral'],
	green: ['blue', 'neutral'],
	red: ['green', 'neutral'],
	neutral: [],
};

const resolveFieldClash = (
	players: Board['players'],
): Partial<Record<'won' | 'lost', { side: Side; card: FieldCard }>> => {
	const [cardA, cardB] = [players.sideA.casting.field, players.sideB.casting.field];
	if (!cardA && !cardB) return {};
	if (!cardA) return { won: { side: 'sideB', card: cardB! } };
	if (!cardB) return { won: { side: 'sideA', card: cardA } };

	if (winnerColorMap[cardA.color].includes(cardB.color))
		return { won: { side: 'sideA', card: cardA }, lost: { side: 'sideB', card: cardB } };
	if (winnerColorMap[cardB.color].includes(cardA.color))
		return { won: { side: 'sideB', card: cardB }, lost: { side: 'sideA', card: cardA } };

	throw new Error(`Failed resolving winner field between “${cardA.name}” and “${cardB.name}”`);
};

const resolveSpellClash = (spells: Turn['spells']): Partial<Record<'won' | 'lost', Array<Turn['spells'][Side]>>> => {
	if (!spells.sideA && !spells.sideB) return {};
	if (!spells.sideA) return { won: [spells.sideB] };
	if (!spells.sideB) return { won: [spells.sideA] };

	if (spells.sideA.slot === spells.sideB.slot) return { lost: [spells.sideA, spells.sideB] };
	if (winnerColorMap[spells.sideA.slot].includes(spells.sideB.slot))
		return { won: [spells.sideA], lost: [spells.sideB] };
	if (winnerColorMap[spells.sideB.slot].includes(spells.sideA.slot))
		return { won: [spells.sideB], lost: [spells.sideA] };

	throw new Error(`Failed resolving winner spell between “${spells.sideA.slot}” and “${spells.sideB.slot}”`);
};

export const createGameInstance = ({
	decks,
	settings,
}: {
	decks: Record<Side, DbCard[]>;
	settings: { castTimeoutMs: number; spellTimeoutMs: number };
}) => {
	const finishedTurns: Turn[] = [];
	const board = initialiseGameBoard({ decks });
	const actions = createHookActions(board);
	const triggerHook = createTriggerHooks(board);

	const drawCard = (side: Side, turn: Pick<Turn, 'draws'>) => {
		const draw = moveTopCard(board.players[side].drawPile, board.players[side].hand);
		if (draw.card) {
			turn.draws[side].push(draw.card);
		}
	};

	async function* handleTurn(): AsyncGenerator<GameIterationResponse> {
		const turn = initialiseTurn({ finishedTurns });

		if (finishedTurns.length === 0) {
			yield { board };
			SIDES.forEach(side => drawCard(side, turn));
			yield { board };
			SIDES.forEach(side => drawCard(side, turn));
			yield { board };
			SIDES.forEach(side => drawCard(side, turn));
			yield { board };
			SIDES.forEach(side => drawCard(side, turn));
			yield { board };
		}

		yield* triggerHook({ hookName: 'beforeDraw', context: { actions, board, turn } });
		board.phase = 'draw';
		yield { board };
		SIDES.forEach(side => drawCard(side, turn));
		yield { board };

		yield* triggerHook({ hookName: 'beforeCast', context: { actions, board, turn } });
		board.phase = 'cast';
		yield { board };

		yield* actions.playerAction({
			sides: ['sideA', 'sideB'],
			timeoutMs: settings.castTimeoutMs,
			onTimeout: noop,
			action: {
				type: 'cast_from_hand',
				config: { type: 'any' },
				onAction: ({ side, cardKey, stack }) => {
					const hand = board.players[side].hand;
					const index = hand.findIndex(handCard => handCard.key === cardKey);
					const card = hand[index];
					invariant(index !== -1 && card, `Card key “${cardKey}” not found in ${side}’s hand`);
					hand.splice(index, 1);

					if (card.type === 'field') {
						board.players[side].casting.field = card;
						return turn.casts[side].field.push(card);
					}
					if (stack && card.colors.includes(stack)) {
						board.players[side].casting[stack] = card;
						return turn.casts[side][stack].push(card);
					}
					throw new Error(`Invalid cast ${card.name}`);
				},
			},
		});

		yield* triggerHook({ hookName: 'beforeReveal', context: { actions, board, turn } });
		board.phase = 'reveal';
		yield { board };
		// Reveals spells cast and moves them into the slots
		SIDES.forEach(side =>
			STACKS.forEach(stack => {
				board.players[side].stacks[stack].push(...turn.casts[side][stack]);
				board.players[side].casting[stack] = undefined;
			}),
		);
		yield { board };

		const fieldClash = resolveFieldClash(board.players);
		yield {
			board,
			highlights: {
				positive: [fieldClash.won?.card].filter(Boolean),
				negative: [fieldClash.lost?.card].filter(Boolean),
			},
		};
		if (fieldClash.won) {
			board.field.push(fieldClash.won.card);
			board.players[fieldClash.won.side].casting.field = undefined;
		}
		if (fieldClash.lost) {
			board.players[fieldClash.lost.side].discardPile.push(fieldClash.lost.card);
			board.players[fieldClash.lost.side].casting.field = undefined;
		}
		yield { board };

		yield* triggerHook({ hookName: 'beforeSpell', context: { actions, board, turn } });
		board.phase = 'spell';
		yield { board };

		yield* actions.playerAction({
			sides: ['sideA', 'sideB'],
			action: {
				type: 'select_spell_stack',
				config: {},
				onAction: ({ stack, side }) => {
					const cardToUse = topOf(board.players[side].stacks[stack]);
					turn.spells[side] = {
						slot: stack,
						card: cardToUse ?? null,
					};
				},
			},
			timeoutMs: settings.spellTimeoutMs,
			onTimeout: noop,
		});

		const spellClash = resolveSpellClash(turn.spells);
		yield {
			board,
			highlights: {
				positive: spellClash.won?.map(spell => spell?.card).filter(Boolean),
				negative: spellClash.lost?.map(spell => spell?.card).filter(Boolean),
			},
		};

		// winner deals damage to loser
	}

	return handleTurn();
};
