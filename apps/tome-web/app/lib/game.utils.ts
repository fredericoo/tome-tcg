import { useCallback, useEffect, useRef, useState } from 'react';

import type { SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { useCombatStackStore, useHighlightedCardsStore } from '../routes/games.$id';
import { api } from './api';

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

export const useGameSub = (gameId: string) => {
	const [latestData, setLatestData] = useState<SanitisedIteration>();
	const [error, setError] = useState<string>();
	const [i, setI] = useState(0);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
	if (status === 'idle') setStatus('connecting');
	const subRef = useRef<Subscription>();
	useEffect(() => {
		const subscription = api.games({ id: gameId }).pubsub.subscribe();
		subscription.on('open', () => setStatus('connected'));
		subscription.on('close', () => {
			setLatestData(undefined);
			setStatus('disconnected');
		});
		subscription.on('error', () => setStatus('error'));

		subscription.subscribe(({ data, isTrusted }) => {
			setError(undefined);
			if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
				setError(data.error);
				return;
			}
			if (isTrusted && data && typeof data === 'object' && 'side' in data) {
				const latestData = data as SanitisedIteration;
				if (latestData.board.highlights) {
					useHighlightedCardsStore.getState().setHighlightedCards(latestData.board.highlights);
					useCombatStackStore.getState().setCombatStack(latestData.board.combatStack);
				}
				setLatestData(latestData);
			}
		});
		subRef.current = subscription;
		return () => {
			subscription.close();
			subRef.current = undefined;
		};
	}, [gameId, i]);
	const reconnect = useCallback(() => {
		setStatus('connecting');
		setI(i => i + 1);
	}, []);

	return { error, status, reconnect, sub: subRef.current, latestData };
};
