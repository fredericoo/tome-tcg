import { DistributiveOmit } from '../../lib/type-utils';
import { Board, createGameBoard } from './engine.board';
import { TurnHooks } from './engine.hooks';
import { handleTurn } from './engine.turn';
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

export const resolveFieldClash = (
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

export const resolveSpellClash = (spells: Turn['spells']): { won: Side | null } => {
	if (!spells.sideA && !spells.sideB) return { won: null };
	if (!spells.sideA) return { won: 'sideB' };
	if (!spells.sideB) return { won: 'sideA' };

	if (spells.sideA.slot === spells.sideB.slot) return { won: null };
	if (winnerColorMap[spells.sideA.slot].includes(spells.sideB.slot)) return { won: 'sideA' };
	if (winnerColorMap[spells.sideB.slot].includes(spells.sideA.slot)) return { won: 'sideB' };

	throw new Error(`Failed resolving winner spell between “${spells.sideA.slot}” and “${spells.sideB.slot}”`);
};

export const initialiseGame = (board: Board): GameIterationResponse => ({
	board,
	actions: {},
	highlights: { effect: new Set(), negative: new Set(), positive: new Set() },
	arrows: [],
});

export type GameSettings = {
	castTimeoutMs: number;
	spellTimeoutMs: number;
	startingCards: number;
	emptySlotAttack: number;
};

export const createGameInstance = ({ decks, settings }: { decks: Record<Side, DbCard[]>; settings: GameSettings }) => {
	const finishedTurns: Turn[] = [];
	const game = initialiseGame(createGameBoard({ decks }));
	return handleTurn({ game, finishedTurns, settings });
};
