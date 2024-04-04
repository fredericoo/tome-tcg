import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { VfxIteration } from '../../../tome-api/src/features/engine/engine.game';
import type { SanitisedGameState, SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { handleVfx } from '../components/game/vfx-canvas';
import { api } from './api';

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

type GameStore = {
	state: SanitisedGameState | undefined;
	error: string | undefined;
	vfxStack: VfxIteration[];
	setState: (state: SanitisedGameState | undefined) => void;
	setError: (error: string | undefined) => void;
	addVfx: (vfx: VfxIteration) => void;
	removeVfx: (vfx: VfxIteration) => void;
};

export const useGameStore = create<GameStore>(set => ({
	state: undefined,
	error: undefined,
	vfxStack: [],
	setState: state => set({ state }),
	setError: error => set({ error }),
	addVfx: vfx => set(s => ({ vfxStack: [...s.vfxStack, vfx] })),
	removeVfx: vfx => set(s => ({ vfxStack: s.vfxStack.filter(v => v !== vfx) })),
}));

export const useGameSub = (gameId: number) => {
	const setGameState = useGameStore(s => s.setState);
	const setGameError = useGameStore(s => s.setError);

	const [i, setI] = useState(0);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
	if (status === 'idle') setStatus('connecting');
	const subRef = useRef<Subscription>();
	useEffect(() => {
		const subscription = api.games({ id: gameId }).pubsub.subscribe();
		subscription.on('open', () => setStatus('connected'));
		subscription.on('close', () => {
			setGameState(undefined);
			setStatus('disconnected');
		});
		subscription.on('error', () => setStatus('error'));

		subscription.subscribe(({ data: _data, isTrusted }) => {
			const data = _data as SanitisedIteration;
			if (!isTrusted) {
				setGameError('Not trusted');
				return;
			}
			switch (data.type) {
				case 'state':
					setGameError(undefined);
					return setGameState(data);
				case 'error':
					return setGameError(data.error);
				case 'attack':
				case 'highlight':
					return handleVfx(data);
			}
		});
		subRef.current = subscription;
		return () => {
			subscription.close();
			subRef.current = undefined;
		};
	}, [gameId, i, setGameError, setGameState]);
	const reconnect = useCallback(() => {
		setStatus('connecting');
		setI(i => i + 1);
	}, []);

	return { status, reconnect, sub: subRef.current };
};
