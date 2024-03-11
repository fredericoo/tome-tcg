import { moveBottomCard, moveTopCard } from './board-utils';
import { AnyCard, Board, Side, SpellStack } from './turn-manager';

type SelectFromHandAction = {
	type: 'select_from_hand';
	config: { type: AnyCard['type'] | 'any'; quantity: number; onActionTaken: (params: { cards: AnyCard[] }) => void };
	action: { cards: AnyCard[] };
};
type SelectSpellStackAction = { type: 'select_spell_stack'; config?: never; action: { stack: SpellStack } };

const validateAction = () => {};

export type PlayerAction = SelectFromHandAction | SelectSpellStackAction;

export const playerAction = <
	TSide extends Side,
	TActionType extends PlayerAction['type'],
	TAction extends Extract<PlayerAction, { type: TActionType }>,
>({
	side,
	type,
	timeoutMs,
	config,
	board,
	onTimeout,
}: {
	side: TSide;
	type: TActionType;
	config: TAction['config'];
	timeoutMs: number;
	board: Board;
	onTimeout?: () => void;
}) => {
	let submitAction: (action: TAction['action']) => void = function () {};
	const completed = new Promise<{ side: TSide; action: TAction['action'] | null; type: TActionType }>(resolve => {
		submitAction = (action: TAction['action']) => {
			validateAction();
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
		TType extends PlayerAction['type'],
		TAction extends Extract<PlayerAction, { type: TType }>,
	>(params: { side: TSide; type: TType; config: TAction['config']; timeoutMs: number }) {
		const { submitAction, completed } = playerAction(params);
		yield { board, action: { submit: submitAction, side: params.side } };
		await completed;
		yield { board };
	},
});

export type HookActions = ReturnType<typeof createHookActions>;
