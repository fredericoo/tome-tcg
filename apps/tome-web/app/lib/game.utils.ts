import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { SanitisedLogIteration } from '../../../tome-api/src/features/engine/engine.log';
import type { SanitisedGameState, SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { handleVfx } from '../components/game/vfx-canvas';
import { api } from './api';
import { createZustandContext } from './zustand';

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

type GameStore = {
	state: SanitisedGameState | undefined;
	setState: (state: SanitisedGameState | undefined) => void;

	chat: SanitisedLogIteration[];
	addMessage: (message: SanitisedLogIteration) => void;

	hoveredKey: number | null;
	setHoveredKey: (cardKey: number | null) => void;
};

export const { Provider: GameProvider, useContext: useGameStore } = createZustandContext(() =>
	create<GameStore>(set => ({
		state: undefined,
		setState: state => set({ state }),

		chat: [],
		addMessage: message => set(s => ({ chat: [...s.chat, message] })),

		hoveredKey: null,
		setHoveredKey: cardKey => set({ hoveredKey: cardKey }),
	})),
);

export const useGameSub = (gameId: number) => {
	const setGameState = useGameStore(s => s.setState);
	const addMessage = useGameStore(s => s.addMessage);

	const [i, setI] = useState(0);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
	if (status === 'idle') setStatus('connecting');
	const subRef = useRef<Subscription>();
	useEffect(() => {
		const subscription = api.games({ id: gameId }).pubsub.subscribe();
		subscription.on('open', () => {
			return setStatus('connected');
		});
		subscription.on('close', () => {
			setGameState(undefined);
			setStatus('disconnected');
		});
		subscription.on('error', () => setStatus('error'));

		subscription.subscribe(({ data: _data, isTrusted }) => {
			const data = _data as SanitisedIteration;
			if (!isTrusted) {
				addMessage({ type: 'error', text: 'Websocket message not trusted', timestamp: Date.now() });
				return;
			}
			switch (data.type) {
				case 'state':
					return setGameState(data);
				case 'error':
				case 'log':
					return addMessage(data);
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
	}, [addMessage, gameId, i, setGameState]);

	const reconnect = useCallback(() => {
		setStatus('connecting');
		setI(i => i + 1);
	}, []);

	return { status, reconnect, sub: subRef.current };
};
