import type { MetaFunction } from '@remix-run/node';
import { useEffect, useRef } from 'react';
import { eden } from '~/lib/api';

export const meta: MetaFunction = () => {
	return [{ title: 'New Remix SPA' }, { name: 'description', content: 'Welcome to Remix (SPA Mode)!' }];
};

export default function Index() {
	const gameId = 'a';

	const subRef = useRef<ReturnType<(typeof eden)['game'][string]['subscribe']>>();
	const sub = subRef.current;
	useEffect(() => {
		const subscription = eden.game[gameId].subscribe({ $query: { user: 'b' } });
		subscription.subscribe(({ data }) => console.log(data));
		subRef.current = subscription;
		return () => {
			subscription.close();
			subRef.current = undefined;
		};
	}, [gameId]);

	//    ^?
	return (
		<div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
			<h1>Playground</h1>

			<button
				onClick={() => {
					sub?.send('lol');
				}}
			>
				Send msg
			</button>
		</div>
	);
}
