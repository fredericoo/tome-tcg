import { SIDES, STACKS, Turn } from './engine.game';

export const getTurnCastCards = (casts: Turn['casts']) =>
	[casts.sideA.field, casts.sideB.field, ...SIDES.flatMap(side => STACKS.flatMap(stack => casts[side][stack]))].filter(
		Boolean,
	);

export const initialiseTurn = ({ finishedTurns }: { finishedTurns: Turn[] }): Turn => ({
	draws: { sideA: [], sideB: [] },
	casts: { sideA: { blue: [], green: [], red: [], field: [] }, sideB: { blue: [], green: [], red: [], field: [] } },
	finishedTurns,
	spells: { sideA: undefined, sideB: undefined },
	extraDamage: { sideA: 0, sideB: 0 },
});
