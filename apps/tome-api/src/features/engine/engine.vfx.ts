import { Side, SpellColor } from './engine.game';

export type VfxEntity =
	| {
			type: 'player';
			side: Side;
	  }
	| {
			type: 'card';
			cardKey: number;
	  }
	| {
			type: 'stack';
			stack: SpellColor;
			side: Side;
	  };

interface BaseVfx {
	type: string;
	durationMs: number;
}

interface VfxHighlight extends BaseVfx {
	type: 'highlight';
	config: {
		type: 'positive' | 'negative' | 'effect' | 'atk_up' | 'atk_down' | 'hp_up' | 'hp_down' | 'fire';
		target: VfxEntity;
	};
}

interface VfxAttack extends BaseVfx {
	type: 'attack';
	config: {
		source: VfxEntity;
		target: VfxEntity;
	};
}

export type VfxIteration = VfxHighlight | VfxAttack;

export type SanitisedVfxIteration = VfxIteration;
