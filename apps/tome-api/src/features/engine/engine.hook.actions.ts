import { objectEntries } from '../../lib/type-utils';
import { delay } from '../../lib/utils';
import { moveBottomCard, moveTopCard, removeCard } from './engine.board';
import { CombatStackItem, GameAction, GameCard, GameIteration, GameState, Side, VfxIteration } from './engine.game';
import { useTriggerHooks } from './engine.hooks';
import { PlayerAction, playerAction } from './engine.turn.actions';

/** Hook-specific actions, that already yield their outcomes. */
export const useGameActions = (game: GameState) => ({
	vfx: async function* (vfx: VfxIteration) {
		yield vfx;
		await delay(500);
	},
	increaseCombatDamage: function* ({
		combatItem,
		amount,
	}: {
		combatItem: CombatStackItem;
		amount: number;
	}): Generator<VfxIteration> {
		const newValue = combatItem.value + amount;
		if (newValue !== combatItem.value && combatItem.source) {
			combatItem.value = newValue;
			yield {
				type: 'highlight',
				config: { type: 'atk_up', target: { type: 'card', cardKey: combatItem.source.key } },
				durationMs: 100 * amount,
			};
		}
	},
	decreaseCombatDamage: function* ({
		combatItem,
		amount,
	}: {
		combatItem: CombatStackItem;
		amount: number;
	}): Generator<VfxIteration> {
		const newValue = Math.max(0, amount - combatItem.value);
		if (newValue !== combatItem.value && combatItem.source) {
			combatItem.value = newValue;
			yield {
				type: 'highlight',
				config: { type: 'atk_down', target: { type: 'card', cardKey: combatItem.source.key } },
				durationMs: 100 * amount,
			};
		}
	},
	discard: function* ({ card, from }: { card: GameCard; from: GameCard[] }) {
		const cardToMove = removeCard(from, card);
		if (!cardToMove) return;
		game.board.discardPile.push(cardToMove);
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
	healPlayer: function* ({ side, amount }: { side: Side; amount: number }): Generator<GameIteration> {
		game.board.players[side].hp = Math.min(game.board.players[side].hp + amount, 100);
		yield {
			type: 'highlight',
			config: { type: 'hp_up', target: { type: 'player', side } },
			durationMs: 300,
		};
		yield game;
	},
	damagePlayer: function* ({ side, amount }: { side: Side; amount: number }): Generator<GameIteration> {
		game.board.players[side].hp -= amount;
		yield {
			type: 'highlight',
			config: { type: 'hp_down', target: { type: 'player', side } },
			durationMs: 300,
		};
		yield game;
	},
	draw: async function* ({ sides }: { sides: Side[] }) {
		const actions = useGameActions(game);
		const { triggerTurnHook } = useTriggerHooks(game);
		for (const side of sides) {
			moveTopCard(game.board.players[side].drawPile, game.board.players[side].hand);
			yield* triggerTurnHook({ hookName: 'onDraw', context: { actions, game } });
		}
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

		async function* yieldAsResolved(): AsyncGenerator<GameState> {
			const actionsLeft = objectEntries(actionEntries).map(([_, { promise }]) => promise.completed);
			if (!actionsLeft.length) return;

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

export type HookActions = ReturnType<typeof useGameActions>;
