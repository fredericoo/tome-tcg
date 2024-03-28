import { exhaustive, pill } from '../../lib/utils';
import { Board, topOf } from './engine.board';
import { COLORS, FieldCard, GameCard, GameIterationResponse, SIDES, Side, SpellCard } from './engine.game';
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
	// TODO: implement these
	onDiscard: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	onDraw: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	onReveal: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	onDealDamage: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	onHeal: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	onClashLose: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
		winnerCard: (THasOwner extends true ? SpellCard : FieldCard) | undefined;
		loserSide: Side;
	}) => AsyncGenerator<GameIterationResponse>;
	onClashWin: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
		loserCard: (THasOwner extends true ? SpellCard : FieldCard) | undefined;
		winnerSide: Side;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeDraw: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeCast: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeReveal: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeSpell: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeCombat: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeDamage: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
	afterDamage: (params: {
		game: GameIterationResponse;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : undefined;
		opponentSide: THasOwner extends true ? Side : undefined;
		thisCard: THasOwner extends true ? SpellCard : FieldCard;
	}) => AsyncGenerator<GameIterationResponse>;
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

export const useTriggerHooks = (game: GameIterationResponse) => {
	async function* triggerTurnHook<THook extends keyof TurnHooks>(params: {
		hookName: THook;
		context: Omit<Parameters<TurnHooks[THook]>[0], 'ownerSide' | 'opponentSide' | 'thisCard'>;
	}) {
		const context = params.context;
		const board = game.board;
		const currentField = topOf(board.field);
		const fieldEffect = currentField?.effects[params.hookName];

		if (fieldEffect) {
			game.highlights.effect.add(currentField.key);
			yield* fieldEffect({
				...context,
				thisCard: currentField,
				opponentSide: undefined,
				ownerSide: undefined,
			} as any);
			game.highlights.effect.delete(currentField.key);
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
				game.highlights.effect.add(spell.key);
				console.log(pill('gray', spell.name), '’s effect triggered by', pill('yellow', params.hookName), 'hook.');

				yield* cardEffect({
					...context,
					ownerSide,
					opponentSide: ownerSide === 'sideA' ? 'sideB' : 'sideA',
					thisCard: spell,
				} as any);
				game.highlights.effect.delete(spell.key);
			}
		}
	}

	return { triggerTurnHook };
};
