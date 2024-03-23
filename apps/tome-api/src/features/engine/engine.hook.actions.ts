import { moveBottomCard, moveTopCard, removeCard } from './engine.board';
import { GameAction, GameCard, GameIterationResponse, Side } from './engine.game';
import { PlayerAction, playerAction } from './engine.turn.actions';

/** Hook-specific actions, that already yield their outcomes. */
export const createHookActions = (game: GameIterationResponse) => ({
	discard: function* ({ card, from, side }: { card: GameCard; from: GameCard[]; side: Side }) {
		const cardToMove = removeCard(from, card);
		if (!cardToMove) return;
		game.board.players[side].discardPile.push(cardToMove);
		yield game;
	},
	moveTopCard: function* (from: GameCard[], to: GameCard[]) {
		moveTopCard(from, to);
		yield game;
	},
	moveBottomCard: function* (from: GameCard[], to: GameCard[]) {
		moveBottomCard(from, to);
		yield game;
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

		actionEntries.forEach(([side, action]) => {
			const newAction = {
				config: params.action.config,
				submit: action.submitAction,
				type: params.action.type,
				timesOutAt,
			} as GameAction;
			game.actions[side] = newAction;
		});

		yield game;

		async function* yieldAsResolved(): AsyncGenerator<GameIterationResponse> {
			const actionsLeft = actionEntries.map(([, action]) => action.completed);
			if (!actionsLeft.length) {
				yield game;
				return;
			}
			const finished = await Promise.race(actionsLeft);
			delete game.actions[finished.side];
			actionEntries.splice(
				actionEntries.findIndex(([side]) => side === finished.side),
				1,
			);
			yield game;
			yield* yieldAsResolved();
		}

		yield* yieldAsResolved();
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
