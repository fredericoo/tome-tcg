import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { SanitisedLogIteration } from '../../../tome-api/src/features/engine/engine.log';
import { VfxIteration } from '../../../tome-api/src/features/engine/engine.vfx';
import type { SanitisedGameState, SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { handleVfx } from '../components/game/vfx-canvas';
import { api } from './api';

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

type GameStore = {
	state: SanitisedGameState | undefined;
	vfxStack: VfxIteration[];
	chat: SanitisedLogIteration[];
	addMessage: (message: SanitisedLogIteration) => void;
	clearChat: () => void;
	setState: (state: SanitisedGameState | undefined) => void;
	addVfx: (vfx: VfxIteration) => void;
	removeVfx: (vfx: VfxIteration) => void;
};

export const useGameStore = create<GameStore>(set => ({
	state: undefined,
	chat: [],
	addMessage: message => set(s => ({ chat: [...s.chat, message] })),
	clearChat: () => set({ chat: [] }),
	vfxStack: [],
	setState: state => set({ state }),
	addVfx: vfx => set(s => ({ vfxStack: [...s.vfxStack, vfx] })),
	removeVfx: vfx => set(s => ({ vfxStack: s.vfxStack.filter(v => v !== vfx) })),
}));

export const useGameSub = (gameId: number) => {
	const setGameState = useGameStore(s => s.setState);
	const addMessage = useGameStore(s => s.addMessage);
	const clearChat = useGameStore(s => s.clearChat);

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
			clearChat();
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
	}, [addMessage, clearChat, gameId, i, setGameState]);
	const reconnect = useCallback(() => {
		setStatus('connecting');
		setI(i => i + 1);
	}, []);

	return { status, reconnect, sub: subRef.current };
};
