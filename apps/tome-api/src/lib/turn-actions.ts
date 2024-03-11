import { moveBottomCard, moveTopCard } from './board-utils';
import { AnyCard, Board, Side, SpellStack } from './turn-manager';
import { exhaustive } from './utils';

type SelectFromHandAction = {
	type: 'select_from_hand';
	config: { type: AnyCard['type'] | 'any'; quantity: number; onActionTaken: (params: { cards: AnyCard[] }) => void };
	action: { cards: AnyCard[] };
};

type SelectSpellStackAction = {
	type: 'select_spell_stack';
	config: { onActionTaken: (params: { stack: SpellStack }) => void };
	action: { stack: SpellStack };
};

export type PlayerAction = SelectFromHandAction | SelectSpellStackAction;

/** Actions to be taken when a player action is submitted.  */
const onAct = <TAction extends PlayerAction>(params: TAction) => {
	switch (params.type) {
		case 'select_from_hand': {
			params.config.onActionTaken(params.action);
			return;
		}
		case 'select_spell_stack':
			params.config.onActionTaken(params.action);
			return;
		default:
			exhaustive(params);
	}
};

export const playerAction = <TSide extends Side, TAction extends PlayerAction>({
	side,
	type,
	timeoutMs,
	config,
	onTimeout,
}: {
	side: TSide;
	type: TAction['type'];
	config: TAction['config'];
	timeoutMs: number;
	onTimeout?: () => void;
}) => {
	let submitAction: (action: TAction['action']) => void = function () {};
	const completed = new Promise<{ side: TSide; action: TAction['action'] | null; type: TAction['type'] }>(resolve => {
		submitAction = (action: TAction['action']) => {
			onAct({ action, config, type } as TAction);
			resolve({ side, type, action });
		};
		setTimeout(() => {
			resolve({ side, type, action: null });
			onTimeout?.();
		}, timeoutMs);
	});
	return { completed, submitAction };
};

export const createHookActions = (board: Board) => ({
	moveTopCard: function* (from: AnyCard[], to: AnyCard[]) {
		moveTopCard(from, to);
		yield { board };
	},
	moveBottomCard: function* (from: AnyCard[], to: AnyCard[]) {
		moveBottomCard(from, to);
		yield { board };
	},
	playerAction: async function* <
		TSide extends Side,
		TAction extends PlayerAction,
		const TType extends TAction['type'],
	>(params: { side: TSide; type: TType; config: (TAction & { type: TType })['config']; timeoutMs: number }) {
		const { submitAction, completed } = playerAction(params);
		yield { board, action: { submit: submitAction, side: params.side } };
		await completed;
		yield { board };
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
