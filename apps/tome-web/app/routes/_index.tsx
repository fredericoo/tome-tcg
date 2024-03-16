import type { MetaFunction } from '@remix-run/node';
import { useSearchParams } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { eden } from '~/lib/api';

export const meta: MetaFunction = () => {
	return [{ title: 'New Remix SPA' }, { name: 'description', content: 'Welcome to Remix (SPA Mode)!' }];
};

const useGameSub = (gameId: string) => {
	const [search] = useSearchParams();
	const user = search.get('user');
	const [latestData, setLatestData] = useState<any>();
	const [i, setI] = useState(0);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
	if (user && status === 'idle') setStatus('connecting');
	const subRef = useRef<ReturnType<(typeof eden)['game'][string]['subscribe']>>();
	useEffect(() => {
		if (!user) return;
		const subscription = eden.game[gameId].subscribe({ $query: { user } });
		subscription.on('open', () => setStatus('connected'));
		subscription.on('close', () => {
			setLatestData(undefined);
			setStatus('disconnected');
		});
		subscription.on('error', () => setStatus('error'));

		subscription.subscribe(({ data, isTrusted }) => {
			if (isTrusted) setLatestData(data);
		});
		subRef.current = subscription;
		return () => {
			subscription.close();
			subRef.current = undefined;
		};
	}, [gameId, user, i]);
	const reconnect = useCallback(() => {
		setStatus('connecting');
		setI(i => i + 1);
	}, []);

	return { status, reconnect, sub: subRef.current, latestData };
};

export default function Index() {
	const gameId = 'testGame';
	const { reconnect, status, sub, latestData } = useGameSub(gameId);

	return (
		<div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
			<h1>Playground</h1>

			<span>status: {status}</span>
			{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
			{status === 'connected' && <button onClick={() => sub?.close()}>Disconnect</button>}
			<button
				onClick={() => {
					sub?.send({ message: 'hello' });
				}}
			>
				Send msg
			</button>

			<div>{JSON.stringify(latestData)}</div>
		</div>
	);
}
