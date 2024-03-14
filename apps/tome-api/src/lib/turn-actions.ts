import { FieldCard, GameCard, Side, SpellCard, SpellStack } from './game-engine';

export type PlayerActionMap = {
	cast_from_hand: {
		type: 'cast_from_hand';
		config: { type: GameCard['type'] | 'any' };
		onAction: (
			params: { side: Side; card: SpellCard; stack: SpellStack } | { side: Side; card: FieldCard; stack?: never },
		) => void;
	};
	select_from_hand: {
		type: 'select_from_hand';
		config: { type: GameCard['type'] | 'any'; quantity: number };
		onAction: (params: { cards: GameCard[] }) => void;
	};
	select_spell_stack: {
		type: 'select_spell_stack';
		config: Record<string, never>;
		onAction: (params: { stack: SpellStack }) => void;
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
	let submitAction: typeof action.onAction = function () {};

	const completed = new Promise<{ side: TSide; action: TAction }>(resolve => {
		submitAction = (params: any) => {
			action.onAction(params);
			resolve({ side, action });
		};

		setTimeout(() => {
			onTimeout({ side, action });
			resolve({ side, action });
		}, timeoutMs);
	});
	return { completed, submitAction };
};
