import { objectEntries } from '../../lib/type-utils';
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
		const requestedAt = Date.now();
		const timesOutAt = Date.now() + params.timeoutMs;
		const actionEntries = sides.reduce(
			(acc, side) => {
				const promise = playerAction({ ...params, side });
				const action = {
					config: params.action.config,
					submit: promise.submitAction,
					type: params.action.type,
					timesOutAt,
					requestedAt,
				} as GameAction;
				acc[side] = {
					promise,
					action,
				};
				return acc;
			},
			{} as Record<TSide, { promise: ReturnType<typeof playerAction>; action: GameAction }>,
		);

		Object.keys(actionEntries).forEach(side => {
			game.actions[side as TSide] = actionEntries[side as TSide].action;
		});
		yield game;

		async function* yieldAsResolved(): AsyncGenerator<GameIterationResponse> {
			const actionsLeft = objectEntries(actionEntries).map(([_, { promise }]) => promise.completed);
			if (!actionsLeft.length) return yield game;

			const finished = await Promise.race(actionsLeft);
			// another action can have taken effect meanwhile
			if (actionEntries[finished.side as TSide].action === game.actions[finished.side]) {
				delete game.actions[finished.side];
			}
			delete actionEntries[finished.side as TSide];

			yield game;
			yield* yieldAsResolved();
		}

		yield* yieldAsResolved();
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
