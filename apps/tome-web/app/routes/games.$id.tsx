import { EdenWS } from '@elysiajs/eden/treaty';
import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData, useSearchParams } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../lib/api';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

export const clientLoader = (async ({ params }) => {
	const gameId = params.id;
	if (!gameId) return redirect('/games');

	const { data, error } = await api.games({ id: gameId }).get();

	if (error) {
		switch (error.status) {
			case 404:
				return redirect('/games');
			default:
				throw error.value;
		}
	}
	return { game: data };
}) satisfies ClientLoaderFunction;

const useGameSub = (gameId: string) => {
	const [search] = useSearchParams();
	const user = search.get('user');
	const [latestData, setLatestData] = useState<unknown>();
	const [i, setI] = useState(0);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
	if (user && status === 'idle') setStatus('connecting');
	const subRef = useRef<EdenWS<any>>();
	useEffect(() => {
		if (!user) return;
		const subscription = api.game({ id: gameId }).subscribe({ query: { user } });
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

export default function Page() {
	const { game } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData } = useGameSub(game.id.toString());

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
