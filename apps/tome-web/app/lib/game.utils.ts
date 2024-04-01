import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import type { SanitisedGameState } from '../../../tome-api/src/features/game/game.pubsub';
import { api } from './api';

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

type GameStore = {
	state: SanitisedGameState | undefined;
	error: string | undefined;
	setState: (state: SanitisedGameState | undefined) => void;
	setError: (error: string | undefined) => void;
};

export const useGameStore = create<GameStore>(set => ({
	state: undefined,
	error: undefined,
	setState: state => set({ state }),
	setError: error => set({ error }),
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

		subscription.subscribe(({ data, isTrusted }) => {
			if (!isTrusted) {
				setGameError('Not trusted');
				return;
			}

			setGameError(undefined);
			if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
				setGameError(data.error);
				return;
			}
			if (data && typeof data === 'object' && 'board' in data) {
				const latestData = data as SanitisedGameState;
				setGameState(latestData);
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
