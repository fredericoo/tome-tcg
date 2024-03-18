import { DistributiveOmit } from '../../lib/type-utils';
import { invariant, noop } from '../../lib/utils';
import { Board, initialiseGameBoard, moveTopCard, topOf } from './engine.board';
import { createHookActions } from './engine.hook.actions';
import { TurnHooks, createTriggerHooks } from './engine.hooks';
import { initialiseTurn } from './engine.turn';
import { PlayerActionMap, playerAction } from './engine.turn.actions';

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

		const onCast =
			(side: Side): PlayerActionMap['cast_from_hand']['onAction'] =>
			({ cardKey, stack }) => {
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
		const timesOutAt = Date.now() + settings.castTimeoutMs;

		const castState: GameIterationResponse = {
			board,
			actions: {
				sideA: { submit: castA.submitAction, config: { type: 'any' }, type: 'cast_from_hand', timesOutAt },
				sideB: { submit: castB.submitAction, config: { type: 'any' }, type: 'cast_from_hand', timesOutAt },
			},
		};
		yield castState;
		const finished = await Promise.race([castA.completed, castB.completed]);
		delete castState.actions?.[finished.side];
		yield castState;
		await Promise.all([castA.completed, castB.completed]);

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
