import { Board, moveBottomCard, moveTopCard, removeCard } from './engine.board';
import { GameCard, GameIterationResponse, Side } from './engine.game';
import { PlayerAction, playerAction } from './engine.turn.actions';

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
	playerAction: async function* <TSide extends Side, TAction extends PlayerAction>({
		sides,
		...params
	}: {
		sides: TSide[];
		action: TAction;
		onTimeout: (params: { side: TSide; action: TAction }) => void;
		timeoutMs: number;
	}) {
		const timesOutAt = Date.now() + params.timeoutMs;
		const actionEntries = sides.map(side => [side, playerAction({ ...params, side })] as const);

		const actionsState = {
			board,
			actions: Object.fromEntries(
				actionEntries.map(([side, action]) => [
					side,
					{
						config: params.action.config,
						submit: action.submitAction,
						type: params.action.type,
						timesOutAt,
					},
				]),
			),
		} satisfies GameIterationResponse;

		yield actionsState;

		async function* yieldAsResolved(): AsyncGenerator<GameIterationResponse> {
			const actionsLeft = actionEntries.map(([, action]) => action.completed);
			if (!actionsLeft.length) {
				yield actionsState;
				return;
			}
			const finished = await Promise.race(actionsLeft);
			delete actionsState.actions[finished.side];
			yield actionsState;
			yield* yieldAsResolved();
		}

		yield* yieldAsResolved();
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
