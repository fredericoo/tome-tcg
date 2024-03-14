import { moveBottomCard, moveTopCard, removeCard } from './board-utils';
import { Board, GameCard, GameIterationResponse, Side } from './game-engine';
import { PlayerAction, playerAction } from './turn-actions';

/** Hook-specific actions, that already yield their outcomes. */
export const createHookActions = (board: Board) => ({
	discard: function* ({ card, from, side }: { card: GameCard; from: GameCard[]; side: Side }) {
		const cardToMove = removeCard(from, card);
		if (!cardToMove) return;
		board.players[side].discardPile.push(cardToMove);
		yield { board };
	},
	moveTopCard: function* (from: GameCard[], to: GameCard[]) {
		moveTopCard(from, to);
		yield { board };
	},
	moveBottomCard: function* (from: GameCard[], to: GameCard[]) {
		moveBottomCard(from, to);
		yield { board };
	},
	playerAction: async function* <TSide extends Side, TAction extends PlayerAction>(params: {
		side: TSide;
		action: TAction;
		onTimeout: (params: { side: TSide; action: TAction }) => void;
		timeoutMs: number;
	}) {
		const { submitAction, completed } = playerAction(params);
		yield {
			board,
			actions: {
				[params.side as Side]: {
					config: params.action.config as TAction['config'],
					submit: submitAction as TAction['onAction'],
					type: params.action.type as TAction['type'],
				},
			},
		} satisfies GameIterationResponse;
		await completed;
		yield { board };
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
