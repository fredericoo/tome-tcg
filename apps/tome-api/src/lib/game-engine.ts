import { Board, initialiseGameBoard, moveTopCard, topOf } from './board';
import { TurnHooks, createTriggerHooks } from './hooks';
import { createHookActions } from './hooks-actions';
import { initialiseTurn } from './turn';
import { PlayerActionMap, playerAction } from './turn-actions';
import { DistributiveOmit } from './type-utils';
import { invariant, noop } from './utils';

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
			};
		}[keyof PlayerActionMap];
	};
};

export type Turn = {
	finishedTurns: Turn[];
	draws: Record<Side, GameCard[]>;
	casts: Record<Side, Record<SpellStack, SpellCard[]> & { field: FieldCard[] }>;
	spells: Record<Side, { slot: SpellStack; card: SpellCard } | undefined>;
};

const winnerColorMap: Record<SpellColor, SpellColor[]> = {
	blue: ['red', 'neutral'],
	green: ['blue', 'neutral'],
	red: ['green', 'neutral'],
	neutral: [],
};

const resolveWinnerField = (
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

export const playGame = ({
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

		yield* triggerHook({ hookName: 'beforeDraw', context: { actions, board, turn } });
		board.phase = 'draw';
		yield { board };
		SIDES.forEach(side => drawCard(side, turn));
		yield { board };

		yield* triggerHook({ hookName: 'beforeCast', context: { actions, board, turn } });
		board.phase = 'cast';
		yield { board };

		const onCast =
			(side: Side): PlayerActionMap['cast_from_hand']['onAction'] =>
			({ card, stack }) => {
				const hand = board.players[side].hand;
				const index = hand.indexOf(card);
				invariant(index !== -1, `Card “${card.name}” not found in ${side}’s hand`);
				hand.splice(index, 1);

				if (card.type === 'field') {
					board.players[side].casting.field = card;
					return turn.casts[side].field.push(card);
				}
				if (stack) {
					board.players[side].casting[stack] = card;
					return turn.casts[side][stack].push(card);
				}
				throw new Error(`Invalid cast ${card}`);
			};

		const [castA, castB] = [
			playerAction({
				side: 'sideA',
				action: {
					type: 'cast_from_hand',
					config: {
						type: 'any',
					},
					onAction: onCast('sideA'),
				},
				timeoutMs: settings.castTimeoutMs,
				onTimeout: noop,
			}),
			playerAction({
				side: 'sideB',
				action: {
					type: 'cast_from_hand',
					config: {
						type: 'any',
					},
					onAction: onCast('sideA'),
				},
				timeoutMs: settings.castTimeoutMs,
				onTimeout: noop,
			}),
		];

		yield {
			board,
			actions: {
				sideA: { submit: castA.submitAction, config: { type: 'any' }, type: 'cast_from_hand' },
				sideB: { submit: castB.submitAction, config: { type: 'any' }, type: 'cast_from_hand' },
			},
		};
		await Promise.all([castA.completed, castB.completed]);

		console.log(castA.completed, castB.completed);

		yield { board };

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

		const { won, lost } = resolveWinnerField(board.players);
		yield { board, highlights: { positive: [won?.card].filter(Boolean), negative: [lost?.card].filter(Boolean) } };
		if (won) {
			board.field.push(won.card);
			board.players[won.side].casting.field = undefined;
		}
		if (lost) {
			board.players[lost.side].discardPile.push(lost.card);
			board.players[lost.side].casting.field = undefined;
		}
		yield { board };

		yield* triggerHook({ hookName: 'beforeSpell', context: { actions, board, turn } });
		board.phase = 'spell';
		yield { board };

		const spellSlotA = playerAction({
			side: 'sideA',
			action: {
				type: 'select_spell_stack',
				config: {},
				onAction: ({ stack }) => {
					const cardToUse = topOf(board.players.sideA.stacks[stack]);
					if (!cardToUse) return;
					turn.spells.sideA = {
						slot: stack,
						card: cardToUse,
					};
				},
			},
			timeoutMs: settings.spellTimeoutMs,
			onTimeout: noop,
		});
	}

	return handleTurn();
};
