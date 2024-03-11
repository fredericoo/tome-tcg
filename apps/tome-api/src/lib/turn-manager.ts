import { initialiseBoardSide, moveTopCard, shuffle, topOf } from './board-utils';
import { CastActionParams, HookActions, createHookActions, playerAction } from './turn-actions';
import { PartialBy } from './type-utils';

export type Side = 'sideA' | 'sideB';
export const SIDES = ['sideA', 'sideB'] as const satisfies Side[];

type SpellColor = 'red' | 'green' | 'blue' | 'neutral';

type BaseCard = {
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

export type AnyCard = SpellCard | FieldCard;

export type SpellStack = 'red' | 'green' | 'blue';

export type Board = {
	players: Record<
		Side,
		{
			hp: number;
			stacks: Record<SpellStack, SpellCard[]>;
			hand: AnyCard[];
			drawPile: AnyCard[];
			discardPile: AnyCard[];
		}
	>;
	field: FieldCard[];
};
43;

type FinishedTurn = {
	finishedTurns: FinishedTurn[];
	draws: Record<Side, AnyCard[]>;
	casts: Record<Side, Record<SpellStack, SpellCard[]> & Record<'field', FieldCard[]>>;
	spells: Record<Side, { slot: SpellStack; card: SpellCard }>;
};

type TurnHooks<THasOwner extends boolean = false> = {
	beforeDraw: (params: {
		turn: Pick<FinishedTurn, 'finishedTurns'>;
		board: Board;
		actions: HookActions;
	}) => Generator<{ board: Board } | undefined>;
	beforeCast: (params: {
		turn: Pick<FinishedTurn, 'finishedTurns' | 'draws'>;
		board: Board;
		actions: HookActions;
	}) => Generator<{ board: Board } | undefined>;
	beforeReveal: (params: {
		turn: Pick<FinishedTurn, 'finishedTurns' | 'draws'>;
		board: Board;
		actions: HookActions;
	}) => Generator<{ board: Board } | undefined>;
	beforeSpell: (
		info: Pick<FinishedTurn, 'finishedTurns' | 'draws' | 'casts'>,
		board: Board,
	) => Generator<{ board: Board } | undefined>;
	beforeCombat: (params: {
		turn: Pick<FinishedTurn, 'finishedTurns' | 'casts' | 'draws' | 'spells'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => Generator<{ board: Board } | undefined>;
	afterCombat: (params: {
		turn: Pick<FinishedTurn, 'finishedTurns' | 'casts' | 'draws' | 'spells'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => Generator<{ board: Board } | undefined>;
};

export const playGame = async (decks: Record<Side, AnyCard[]>, settings: { castTimeoutMs: 10000 }) => {
	const finishedTurns: FinishedTurn[] = [];
	const board: Board = {
		field: [],
		players: {
			sideA: initialiseBoardSide(decks.sideA),
			sideB: initialiseBoardSide(decks.sideB),
		},
	};

	const actions = createHookActions(board);
	const getCurrentField = (board: Board) => topOf(board.field);
	const drawCard = (side: Side, turn: Pick<FinishedTurn, 'draws'>) => {
		const draw = moveTopCard(board.players[side].drawPile, board.players[side].hand);
		if (draw.card) {
			turn.draws[side].push(draw.card);
		}
	};

	async function* triggerHooks<THook extends keyof TurnHooks>(params: {
		hookName: THook;
		context: Parameters<TurnHooks[THook]>[0];
	}) {
		const currentField = getCurrentField(board);
		const fieldEffect = currentField?.effects[params.hookName];
		if (fieldEffect) {
			yield* fieldEffect(params.context as any, board);
		}

		const cards = SIDES.flatMap(side => Object.values(board.players[side].stacks).map(topOf)).filter(Boolean);
		for (const card of cards) {
			const cardEffect = card.effects[params.hookName];
			if (cardEffect) {
				yield* cardEffect(params.context as any, board);
			}
		}
	}

	async function* handleTurn() {
		const turn: PartialBy<FinishedTurn, 'spells'> = {
			draws: { sideA: [], sideB: [] },
			casts: { sideA: { blue: [], field: [], green: [], red: [] }, sideB: { blue: [], field: [], green: [], red: [] } },
			finishedTurns,
			spells: undefined,
		};

		/** Draw phase */
		yield triggerHooks({ hookName: 'beforeDraw', context: { actions, board, turn } });
		SIDES.forEach(side => drawCard(side, turn));
		yield { board };

		/** Cast phase */
		yield triggerHooks({ hookName: 'beforeCast', context: { actions, board, turn } });

		const onCast =
			(side: Side) =>
			({ card, stack }: CastActionParams) => {
				if (card.type === 'field') {
					return turn.casts[side]['field'].push(card);
				}
				if (stack) {
					return turn.casts[side][stack].push(card);
				}
				throw new Error(`Invalid cast ${card}`);
			};
		const [actionA, actionB] = [
			playerAction({
				side: 'sideA',
				type: 'cast_from_hand',
				config: {
					type: 'any',
					onActionTaken: onCast('sideA'),
				},
				timeoutMs: settings.castTimeoutMs,
			}),
			playerAction({
				side: 'sideB',
				type: 'cast_from_hand',
				config: {
					type: 'any',
					onActionTaken: onCast('sideB'),
				},
				timeoutMs: settings.castTimeoutMs,
			}),
		];
		yield { board, actions: { sideA: actionA.submitAction, sideB: actionB.submitAction } };

		await Promise.allSettled([actionA.completed, actionB.completed]);

		yield { board };

		/** Reveal phase */
		yield triggerHooks({ hookName: 'beforeReveal', context: { actions, board, turn } });
		// Rock Paper Scissors time
	}

	SIDES.map(side => shuffle(board.players[side].drawPile));

	return handleTurn();
};

const _cards: AnyCard[] = [
	{
		id: '1',
		type: 'field',
		name: 'Sacred Pool',
		description: 'If both players cast spells from the blue stack during combat, heals both wizards for 10 HP.',
		color: 'blue',
		effects: {
			afterCombat: function* ({ board, turn }) {
				if (turn.spells.sideA.slot === 'blue' && turn.spells.sideB.slot === 'blue') {
					board.players.sideA.hp += 10;
					board.players.sideB.hp += 10;
					yield { board };
				}
			},
		},
	},
	{
		id: '2',
		type: 'spell',
		name: 'Frost Burn',
		description: 'When you cast a spell from the blue stack, discard the top card from your opponents green stack.',
		colors: ['blue'],
		attack: 10,
		effects: {
			beforeCombat: function* ({ actions, ownerSide, turn, board }) {
				if (turn.spells[ownerSide].slot === 'blue') {
					const opponentSide = ownerSide === 'sideA' ? 'sideB' : 'sideA';
					actions.moveTopCard(board.players[opponentSide].stacks.green, board.players[opponentSide].discardPile);
					yield { board };
				}
			},
		},
	},
	{
		id: '3',
		type: 'field',
		name: 'Void Space',
		description: 'Before combat, each player chooses one of their spell slots, and discards the top card from it',
		color: 'neutral',
		effects: {
			beforeCombat: function* ({ actions, board }) {
				for (const side of SIDES) {
					yield actions.playerAction({
						side,
						type: 'select_spell_stack',
						config: {
							onActionTaken: ({ stack }) => {
								actions.moveTopCard(board.players[side].stacks[stack], board.players[side].discardPile);
							},
						},
						timeoutMs: 10000,
					});
				}
				yield { board };
			},
		},
	},
];
