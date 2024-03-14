import { initialiseGameBoard, moveTopCard, topOf } from './board-utils';
import { TurnHooks, createTriggerHooks } from './hooks';
import { createHookActions } from './hooks-actions';
import { PlayerActionMap, playerAction } from './turn-actions';
import { DistributiveOmit, PartialBy } from './type-utils';
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
	actions?: {
		[A in keyof PlayerActionMap]: {
			[K in Side]?: {
				type: A;
				config: PlayerActionMap[A]['config'];
				submit: PlayerActionMap[A]['onAction'];
			};
		};
	}[keyof PlayerActionMap];
};

export type Board = {
	players: Record<
		Side,
		{
			side: Side;
			hp: number;
			stacks: Record<SpellStack, SpellCard[]>;
			hand: GameCard[];
			drawPile: GameCard[];
			discardPile: GameCard[];
		}
	>;
	field: FieldCard[];
};

export type FinishedTurn = {
	finishedTurns: FinishedTurn[];
	draws: Record<Side, GameCard[]>;
	casts: Record<Side, Record<SpellStack, SpellCard[]> & Record<'field', FieldCard[]>>;
	spells: Record<Side, { slot: SpellStack; card: SpellCard }>;
};

export const initialiseTurn = ({
	finishedTurns,
}: {
	finishedTurns: FinishedTurn[];
}): PartialBy<FinishedTurn, 'spells'> => ({
	draws: { sideA: [], sideB: [] },
	casts: { sideA: { blue: [], field: [], green: [], red: [] }, sideB: { blue: [], field: [], green: [], red: [] } },
	finishedTurns,
	spells: undefined,
});

export const playGame = async ({
	decks,
	settings,
}: {
	decks: Record<Side, DbCard[]>;
	settings: { castTimeoutMs: 10000 };
}) => {
	const finishedTurns: FinishedTurn[] = [];
	const board = initialiseGameBoard({ decks });
	const actions = createHookActions(board);
	const triggerHooks = createTriggerHooks(board);

	const drawCard = (side: Side, turn: Pick<FinishedTurn, 'draws'>) => {
		const draw = moveTopCard(board.players[side].drawPile, board.players[side].hand);
		if (draw.card) {
			turn.draws[side].push(draw.card);
		}
	};

	async function* handleTurn() {
		const turn = initialiseTurn({ finishedTurns });

		/** Draw phase */
		yield triggerHooks({ hookName: 'beforeDraw', context: { actions, board, turn } });
		SIDES.forEach(side => drawCard(side, turn));
		yield { board };

		/** Cast phase */
		yield triggerHooks({ hookName: 'beforeCast', context: { actions, board, turn } });

		const onCast =
			(side: Side): PlayerActionMap['cast_from_hand']['onAction'] =>
			({ card, stack }) => {
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
		yield { board, actions: { sideA: actionA.submitAction, sideB: actionB.submitAction } };

		await Promise.allSettled([actionA.completed, actionB.completed]);

		yield { board };

		/** Reveal phase */
		yield triggerHooks({ hookName: 'beforeReveal', context: { actions, board, turn } });
		// Rock Paper Scissors time
	}

	return handleTurn();
};

const _cards: DbCard[] = [
	{
		id: '1',
		type: 'field',
		name: 'Sacred Pool',
		description: 'If both players cast spells from the blue stack during combat, heals both wizards for 10 HP.',
		color: 'blue',
		effects: {
			afterCombat: async function* ({ board, turn }) {
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
			beforeCombat: async function* ({ actions, ownerSide, turn, board }) {
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
			beforeCombat: async function* ({ actions, board }) {
				const discardFromStack = (stack: SpellStack, side: Side) => {
					const selectedStack = board.players[side].stacks[stack];
					const cardToDiscard = topOf(selectedStack);
					if (!cardToDiscard) return;
					actions.discard({ card: cardToDiscard, from: selectedStack, side });
				};

				for (const side of SIDES) {
					yield* actions.playerAction({
						action: {
							type: 'select_spell_stack',
							config: {},
							onAction: ({ stack }) => {
								discardFromStack(stack, side);
							},
						},
						side,
						timeoutMs: 10000,
						onTimeout: () => {
							const randomStack = STACKS[Math.floor(Math.random() * STACKS.length)];
							invariant(randomStack, 'randomStack is undefined');
							discardFromStack(randomStack, side);
						},
					});
				}
				yield { board };
			},
		},
	},
];
