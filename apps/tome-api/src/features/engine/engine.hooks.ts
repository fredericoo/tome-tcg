import { exhaustive } from '../../lib/utils';
import { Board, topOf } from './engine.board';
import { GameCard, GameIterationResponse, SIDES, STACKS, Side, SpellCard, Turn } from './engine.game';
import { HookActions } from './engine.hook.actions';

export type TurnHooks<THasOwner extends boolean = false> = {
	// TODO: implement these
	onDiscard: (params: {
		turn: Partial<Turn>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	onDraw: (params: {
		turn: Partial<Turn>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	onDamage: (params: {
		turn: Partial<Turn>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	onHeal: (params: {
		turn: Partial<Turn>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;

	beforeDraw: (params: {
		turn: Pick<Turn, 'finishedTurns'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeCast: (params: {
		turn: Pick<Turn, 'finishedTurns' | 'draws'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeReveal: (params: {
		turn: Pick<Turn, 'finishedTurns' | 'draws'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeSpell: (params: {
		turn: Pick<Turn, 'finishedTurns' | 'draws' | 'casts'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	beforeCombat: (params: {
		turn: Pick<Turn, 'finishedTurns' | 'casts' | 'draws' | 'spells'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
	afterCombat: (params: {
		turn: Pick<Turn, 'finishedTurns' | 'casts' | 'draws' | 'spells'>;
		board: Board;
		actions: HookActions;
		ownerSide: THasOwner extends true ? Side : never;
	}) => AsyncGenerator<GameIterationResponse>;
};

const isOnTheBoard = ({ board, card }: { board: Board; card: GameCard }) => {
	switch (card.type) {
		case 'field':
			return topOf(board.field) === card;
		case 'spell':
			return STACKS.flatMap(stack => SIDES.map(side => topOf(board.players[side].stacks[stack])))
				.filter(Boolean)
				.includes(card);
		default:
			exhaustive(card);
	}
};

export const createTriggerHooks = (board: Board) =>
	async function* triggerHooks<THook extends keyof TurnHooks>(params: {
		hookName: THook;
		context: Omit<Parameters<TurnHooks[THook]>[0], 'ownerSide'>;
	}) {
		const currentField = topOf(board.field);
		const fieldEffect = currentField?.effects[params.hookName];
		const context = params.context;
		if (fieldEffect) {
			yield* fieldEffect(params.context as any);
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
				yield* cardEffect({
					board: context.board,
					actions: context.actions,
					// @ts-expect-error - union too complex
					turn: context.turn,
					ownerSide,
				});
			}
		}
	};
