import { DistributiveOmit } from '../../lib/type-utils';
import { Board, createGameBoard } from './engine.board';
import { useGameActions } from './engine.hook.actions';
import { TurnHooks, effectVfx } from './engine.hooks';
import { handleTurn, initialiseTurn } from './engine.turn';
import { PlayerActionMap } from './engine.turn.actions';

export type Side = 'sideA' | 'sideB';
export const SIDES = ['sideA', 'sideB'] as const satisfies Side[];

export type SpellColor = 'red' | 'green' | 'blue';

type BaseCard = {
	key: number;
	id: string;
	name: string;
	description: string;
	image?: string;
};

export type DynamicCombatValue = {
	label: string;
	getValue: ({
		game,
		ownerSide,
		opponentSide,
		thisCard,
	}: {
		game: GameState;
		ownerSide: Side;
		opponentSide: Side;
		thisCard: SpellCard;
	}) => number;
};

export type CombatValue = number | DynamicCombatValue;
export interface SpellCard extends BaseCard {
	type: 'spell';
	name: string;
	colors: SpellColor[];
	attack: CombatValue;
	heal?: CombatValue;
	effects: Partial<TurnHooks<true>>;
}

export interface FieldCard extends BaseCard {
	type: 'field';
	name: string;
	color: SpellColor | null;

	effects: Partial<TurnHooks>;
}

export type GameCard = SpellCard | FieldCard;

export const CARD_TYPES = ['field', 'spell'] as const satisfies Array<GameCard['type']>;

// TODO: reference this from the drizzle model
export type DbCard = DistributiveOmit<GameCard, 'key'>;

export const COLORS = ['red', 'green', 'blue'] as const satisfies SpellColor[];

export type GameAction = {
	[A in keyof PlayerActionMap]: {
		type: A;
		config: PlayerActionMap[A]['config'];
		submit: PlayerActionMap[A]['onAction'];
		timesOutAt: number;
		requestedAt: number;
	};
}[keyof PlayerActionMap];

export type GameState = {
	type: 'state';
	finishedTurns: Turn[];
	turn: Turn;
	board: Board;
	actions: {
		[K in Side]?: GameAction;
	};
};

type VfxEntity =
	| {
			type: 'player';
			side: Side;
	  }
	| {
			type: 'card';
			cardKey: number;
	  }
	| {
			type: 'stack';
			stack: SpellColor;
			side: Side;
	  };

interface BaseVfx {
	type: string;
	durationMs: number;
}

interface VfxHighlight extends BaseVfx {
	type: 'highlight';
	config: {
		type: 'positive' | 'negative' | 'effect';
		target: VfxEntity;
	};
}

interface VfxAttack extends BaseVfx {
	type: 'attack';
	config: {
		type: 'positive' | 'negative' | 'effect';
		source: VfxEntity;
		target: VfxEntity;
	};
}

export type VfxIteration = VfxHighlight | VfxAttack;

export type GameIteration = GameState | VfxIteration;

export type CombatStackItem =
	| {
			source: GameCard | null;
			value: number;
			type: 'damage';
			target: Side;
	  }
	| {
			source: GameCard | null;
			value: number;
			type: 'heal';
			target: Side;
	  };

type SpellAttack = { slot: SpellColor; card: SpellCard | null };
export type Turn = { combatStack: CombatStackItem[] } & Record<
	Side,
	{
		draws: GameCard[];
		casts: Record<SpellColor, SpellCard[]> & { field: FieldCard[] };
		spellAttack: SpellAttack | undefined;
	}
>;

const winnerColorMap: Record<SpellColor, SpellColor> = {
	blue: 'red',
	green: 'blue',
	red: 'green',
};

export const resolveFieldClash = ({
	cardA,
	cardB,
}: Record<'cardA' | 'cardB', FieldCard | undefined>): { won: Side | null } => {
	// vs no card
	if (!cardA && !cardB) return { won: null };
	if (!cardA) return { won: 'sideB' };
	if (!cardB) return { won: 'sideA' };

	// vs neutral
	if (!cardA.color && !cardB.color) return { won: null };
	if (!cardB.color) return { won: 'sideA' };
	if (!cardA.color) return { won: 'sideB' };

	// vs card
	if (winnerColorMap[cardA.color] === cardB.color) return { won: 'sideB' };
	if (winnerColorMap[cardB.color] === cardA.color) return { won: 'sideA' };

	return { won: null };
};

export const resolveSpellClash = ({
	spellA,
	spellB,
}: {
	spellA?: SpellAttack;
	spellB?: SpellAttack;
}): { won: Side | null } => {
	// vs no spell
	if (!spellA && !spellB) return { won: null };
	if (!spellA) return { won: 'sideB' };
	if (!spellB) return { won: 'sideA' };

	// vs spell
	if (spellA.slot === spellB.slot) return { won: null };
	if (winnerColorMap[spellA.slot].includes(spellB.slot)) return { won: 'sideA' };
	if (winnerColorMap[spellB.slot].includes(spellA.slot)) return { won: 'sideB' };

	return { won: null };
};

export async function* runClashEffects({
	winnerCard,
	loserCard,
	winnerSide,
	loserSide,
	actions,
	game,
}: {
	winnerCard?: GameCard | null;
	loserCard?: GameCard | null;
	winnerSide: Side;
	loserSide: Side;
	actions: ReturnType<typeof useGameActions>;
	game: GameState;
}) {
	if (winnerCard && loserCard && loserCard.type !== winnerCard.type)
		throw new Error('Clash needs two cards of the same type');

	switch (winnerCard?.type) {
		case 'field': {
			const effect = winnerCard.effects.onClashWin;
			if (!effect) break;
			yield* effect({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: winnerCard,
				loserCard: loserCard?.type === 'field' ? loserCard : undefined,
				winnerSide,
				cardEffectHighlight: effectVfx(winnerCard),
			});
			break;
		}
		case 'spell': {
			const effect = winnerCard.effects.onClashWin;
			if (!effect) break;
			yield* effect({
				actions,
				game,
				ownerSide: winnerSide,
				opponentSide: loserSide,
				thisCard: winnerCard,
				loserCard: loserCard?.type === 'spell' ? loserCard : undefined,
				winnerSide,
				cardEffectHighlight: effectVfx(winnerCard),
			});
			break;
		}
	}
	switch (loserCard?.type) {
		case 'field': {
			const effect = loserCard.effects.onClashLose;
			if (!effect) break;
			yield* effect({
				actions,
				game,
				ownerSide: undefined,
				opponentSide: undefined,
				thisCard: loserCard,
				winnerCard: winnerCard?.type === 'field' ? loserCard : undefined,
				loserSide,
				cardEffectHighlight: effectVfx(loserCard),
			});
			break;
		}
		case 'spell': {
			const effect = loserCard.effects.onClashLose;
			if (!effect) break;
			yield* effect({
				actions,
				game,
				ownerSide: winnerSide,
				opponentSide: loserSide,
				thisCard: loserCard,
				winnerCard: winnerCard?.type === 'spell' ? loserCard : undefined,
				loserSide,
				cardEffectHighlight: effectVfx(loserCard),
			});
			break;
		}
	}
}

export const initialiseGame = (board: Board): GameState => ({
	type: 'state',
	board,
	finishedTurns: [],
	turn: initialiseTurn(),
	actions: {},
});

export const getCardColors = (card: GameCard): SpellColor[] => {
	switch (card.type) {
		case 'field':
			return card.color ? [card.color] : [];
		case 'spell':
			return card.colors;
	}
};

export type GameSettings = {
	castTimeoutMs: number;
	spellTimeoutMs: number;
	startingCards: number;
	emptySlotAttack: number;
	/** Delay after declaring a new turn phase */
	phaseDelayMs: number;
	effectHighlightMs: number;
};

export const createGameInstance = ({ decks, settings }: { decks: Record<Side, DbCard[]>; settings: GameSettings }) => {
	const game = initialiseGame(createGameBoard({ decks }));
	return handleTurn({ game, settings });
};
