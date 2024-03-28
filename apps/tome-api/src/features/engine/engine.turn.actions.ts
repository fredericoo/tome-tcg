import { GameCard, GameIterationResponse, Side, SpellColor } from './engine.game';

export type PlayerActionMap = {
	select_from_hand: {
		type: 'select_from_hand';
		config: {
			availableTypes: Array<GameCard['type']>;
			availableColors: SpellColor[];
			from: 'self' | 'opponent';
			min: number;
			max: number;
			message: string;
			skippable: boolean;
		};
		onAction: (params: {
			side: Side;
			cardKeys: number[];
		}) => Generator<GameIterationResponse> | AsyncGenerator<GameIterationResponse>;
	};
	select_spell_stack: {
		type: 'select_spell_stack';
		config: {
			availableStacks: SpellColor[];
			from: 'self' | 'opponent';
			min: number;
			max: number;
			message: string;
			skippable: boolean;
		};
		onAction: (params: {
			side: Side;
			stacks: SpellColor[];
		}) => Generator<GameIterationResponse> | AsyncGenerator<GameIterationResponse>;
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
	const { promise: completed, resolve } = Promise.withResolvers<{ side: TSide; action: TAction }>();
	const timeoutAction = setTimeout(() => {
		onTimeout({ side, action });
		resolve({ side, action });
	}, timeoutMs);

	return {
		completed,
		submitAction: async function* (params: any) {
			// TODO: Validate actions here.
			clearTimeout(timeoutAction);
			resolve({ side, action });
			yield* action.onAction(params);
		},
	};
};
