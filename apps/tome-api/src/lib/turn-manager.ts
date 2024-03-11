import { initialiseBoardSide, moveTopCard, shuffle } from './board-utils';
import { HookActions, createHookActions, playerAction } from './turn-actions';
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

type BoardCardProps = { boardId: string };

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
	casts: Record<Side, AnyCard[]>;
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
	beforeReveal: (
		info: Pick<FinishedTurn, 'finishedTurns' | 'draws'>,
		board: Board,
	) => Generator<{ board: Board } | undefined>;
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

const topOf = <T>(arr: T[]) => arr[arr.length - 1];

export const turnHandler = async (decks: Record<Side, AnyCard[]>, settings: { castTimeoutMs: 10000 }) => {
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
			casts: { sideA: [], sideB: [] },
			finishedTurns,
			spells: undefined,
		};

		/** Draw phase */
		triggerHooks({ hookName: 'beforeDraw', context: { actions, board, turn: { finishedTurns } } });
		SIDES.forEach(side => drawCard(side, turn));
		yield { board };

		/** Cast phase */
		triggerHooks({ hookName: 'beforeCast', context: { actions, board, turn: { finishedTurns, draws } } });
		const [actionA, actionB] = [
			playerAction({ side: 'sideA', type: 'select_any_from_hand', timeoutMs: settings.castTimeoutMs }),
			playerAction({ side: 'sideB', type: 'select_any_from_hand', timeoutMs: settings.castTimeoutMs }),
		];
		yield { board, actions: { sideA: actionA.submitAction, sideB: actionB.submitAction } };

		await Promise.allSettled([actionA.completed, actionB.completed]);
		yield { board };
	}

	SIDES.map(side => shuffle(board.players[side].drawPile));

	for await (const turn of handleTurn()) {
		console.log(board);
	}
};

const cards: AnyCard[] = [
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
			beforeCombat: function* ({ actions }) {},
		},
	},
];
