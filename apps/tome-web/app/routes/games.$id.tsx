import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { RerenderEvery } from '../components/rerender-every';
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

type Subscription = ReturnType<ReturnType<(typeof api)['games']>['pubsub']['subscribe']>;

const useGameSub = (gameId: string) => {
	const [latestData, setLatestData] = useState<SanitisedIteration>();
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
			if (isTrusted) setLatestData(data as SanitisedIteration);
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

			<p>Phase: {latestData?.board.phase}</p>
			<p>
				<RerenderEvery seconds={1}>
					{() => {
						if (!latestData) return null;
						const action = latestData.board[latestData.side].action;
						if (!action) return null;
						const date = new Date(action.timesOutAt);
						// return seconds remaining
						return <span>Time left for action: {Math.floor((date.getTime() - Date.now()) / 1000)}</span>;
					}}
				</RerenderEvery>
			</p>
		</div>
	);
}
