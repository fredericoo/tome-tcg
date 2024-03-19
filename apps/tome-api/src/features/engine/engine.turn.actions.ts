import { GameCard, Side, SpellStack } from './engine.game';

export type PlayerActionMap = {
	cast_from_hand: {
		type: 'cast_from_hand';
		config: { type: GameCard['type'] | 'any' };
		onAction: (params: { side: Side; cardKey: number; stack?: SpellStack }) => void;
	};
	select_from_hand: {
		type: 'select_from_hand';
		config: { type: GameCard['type'] | 'any'; quantity: number };
		onAction: (params: { side: Side; cards: GameCard[] }) => void;
	};
	select_spell_stack: {
		type: 'select_spell_stack';
		config: Record<string, never>;
		onAction: (params: { side: Side; stack: SpellStack }) => void;
	};
};

export type PlayerAction = PlayerActionMap[keyof PlayerActionMap];

export const playerAction = <TSide extends Side, TAction extends PlayerAction>({
	side,
	timeoutMs,
	onTimeout,
	action,
}: {
	side: TSide;
	action: TAction;
	timeoutMs: number;
	onTimeout: (params: { side: TSide; action: TAction }) => void;
}) => {
	let submitAction: TAction['onAction'] = function () {};

	const completed = new Promise<{ side: TSide; action: TAction }>(resolve => {
		const timeoutAction = setTimeout(() => {
			onTimeout({ side, action });
			resolve({ side, action });
		}, timeoutMs);

		submitAction = (params: any) => {
			action.onAction(params);
			clearTimeout(timeoutAction);
			resolve({ side, action });
		};
	});
	return { completed, submitAction };
};
