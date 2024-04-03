import { exhaustive, pill } from '../../lib/utils';
import { Board, topOf } from './engine.board';
import {
	COLORS,
	FieldCard,
	GameCard,
	GameIteration,
	GameState,
	SIDES,
	Side,
	SpellCard,
	VfxIteration,
} from './engine.game';
import { HookActions } from './engine.hook.actions';

/** Hooks that can be activated on demand by other cards. */
export const ACTIVATABLE_HOOKS = [
	'beforeCombat',
	'beforeCast',
	'beforeDraw',
	'beforeReveal',
	'onDealDamage',
	'onDraw',
	'onHeal',
	'onReveal',
] as const satisfies Array<keyof TurnHooks<true>>;

export type TurnHooks<THasOwner extends boolean = false> = {
	onDiscard: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	onDraw: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	onReveal: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	onDealDamage: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	onHeal: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	onClashLose: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
		winnerCard: (THasOwner extends true ? SpellCard : FieldCard) | undefined;
		loserSide: Side;
	}) => AsyncGenerator<GameIteration>;
	onClashWin: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
		loserCard: (THasOwner extends true ? SpellCard : FieldCard) | undefined;
		winnerSide: Side;
	}) => AsyncGenerator<GameIteration>;
	beforeDraw: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	beforeCast: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	beforeReveal: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	beforeSpell: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	beforeCombat: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	beforeDamage: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
	afterDamage: (params: {
		game: GameState;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIteration>;
};

const isOnTheBoard = ({ board, card }: { board: Board; card: GameCard }) => {
	switch (card.type) {
		case 'field':
			return topOf(board.field) === card;
		case 'spell':
			return COLORS.flatMap(stack => SIDES.map(side => topOf(board.players[side].stacks[stack])))
				.filter(Boolean)
				.includes(card);
		default:
			exhaustive(card);
	}
};

export const effectVfx = (card: GameCard): VfxIteration => ({
	type: 'highlight',
	durationMs: 300,
	config: { type: 'effect', target: { type: 'card', cardKey: card.key } },
});

export const useTriggerHooks = (game: GameState) => {
	async function* triggerTurnHook<THook extends keyof TurnHooks>(params: {
		hookName: THook;
		context: Omit<Parameters<TurnHooks[THook]>[0], 'ownerSide' | 'opponentSide' | 'thisCard'>;
	}) {
		const context = params.context;
		const board = game.board;
		const currentField = topOf(board.field);
		const fieldEffect = currentField?.effects[params.hookName];

		if (fieldEffect) {
			try {
				yield* fieldEffect({
					...context,
					thisCard: currentField,
					opponentSide: undefined,
					ownerSide: undefined,
				} as any);
			} catch (e) {
				console.error(`Error in ${currentField.name}’s ${params.hookName} effect:`, e);
			}
		}

		const effectStacks: Array<[SpellCard[], Side]> = [
			[board.players.sideA.stacks.red, 'sideA'],
			[board.players.sideB.stacks.red, 'sideB'],
			[board.players.sideA.stacks.green, 'sideA'],
			[board.players.sideB.stacks.green, 'sideB'],
			[board.players.sideA.stacks.blue, 'sideA'],
			[board.players.sideB.stacks.blue, 'sideB'],
		];

		for (const [stack, ownerSide] of effectStacks) {
			const spell = topOf(stack);
			// a previous effect may have removed the card from the board
			if (!spell || !isOnTheBoard({ board, card: spell })) continue;

			const cardEffect = spell.effects[params.hookName];
			if (cardEffect) {
				try {
					yield* cardEffect({
						...context,
						ownerSide,
						opponentSide: ownerSide === 'sideA' ? 'sideB' : 'sideA',
						thisCard: spell,
					} as any);
					console.log(pill('gray', spell.name), '’s effect triggered by', pill('yellow', params.hookName), 'hook.');
				} catch (e) {
					console.error(`Error in ${spell.name}’s ${params.hookName} effect:`, e);
				}
			}
		}
	}

	return { triggerTurnHook };
};
