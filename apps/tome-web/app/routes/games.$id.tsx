import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

import { DbCard, Side } from '../../../tome-api/src/features/engine/engine.game';
import { SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { Card } from '../components/card';
import { RerenderEvery } from '../components/rerender-every';
import { api } from '../lib/api';
import { useGameSub } from '../lib/game.utils';

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
	return data;
}) satisfies ClientLoaderFunction;

const GameSide = ({
	side,
	cards,
	relative,
}: {
	side: SanitisedIteration['board'][Side];
	cards: Record<string, Pick<DbCard, 'name' | 'description' | 'type'>>;
	relative: 'opponent' | 'player';
}) => {
	return (
		<section className={clsx('flex gap-4 p-4', { 'flex-row-reverse': relative === 'opponent' })}>
			<div className="flex-1">
				<div aria-label="Draw pile" className="relative inline-block">
					<ol className="grid">
						{
							// we only add the last 5 cards onto the dom to avoid excessive dom nodes
							side.drawPile.slice(-5).map(cardRef => (
								<li className="col-end-1 row-end-1" key={cardRef.key}>
									<Card layoutId={cardRef.key} data={cardRef.id ? cards[cardRef.id] : undefined} />
								</li>
							))
						}
					</ol>
					<p
						aria-label="Cards in pile"
						className="absolute -right-2 -top-2 inline-block rounded-full bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-50"
					>
						{side.drawPile.length}
					</p>
				</div>
			</div>

			<ol aria-label="Hand" className="flex flex-grow justify-center p-2">
				{side.hand.map((cardRef, index) => {
					// fan out the cards
					const fanRatio = 2;
					const angle = (index + 0.5 - side.hand.length / 2) * fanRatio;
					const y = Math.cos(Math.abs(angle) / fanRatio) * -10 * fanRatio;
					return (
						<motion.li
							animate={{ marginInline: '-10px', transform: `rotate(${angle}deg) translateY(${y}px)` }}
							key={cardRef.key}
						>
							<Card layoutId={cardRef.key} data={cardRef.id ? cards[cardRef.id] : undefined} />
						</motion.li>
					);
				})}
			</ol>

			<div className="flex-1" />
		</section>
	);
};

export default function Page() {
	const { game, cards } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData } = useGameSub(game.id.toString());

	const playerSide = latestData?.board[latestData.side];
	const opponentSide = latestData?.board[latestData.side === 'sideA' ? 'sideB' : 'sideA'];

	return (
		<div className="flex min-h-screen flex-col bg-neutral-100">
			{opponentSide && <GameSide relative="opponent" cards={cards} side={opponentSide} />}

			<section className="flex-grow">
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
				<p className="text-center">Phase: {latestData?.board.phase}</p>

				<RerenderEvery seconds={1}>
					{() => {
						if (!latestData) return null;
						const action = latestData.board[latestData.side].action;
						if (!action) return null;
						const date = new Date(action.timesOutAt);
						// return seconds remaining
						return <p>Time left for action: {Math.floor((date.getTime() - Date.now()) / 1000)}</p>;
					}}
				</RerenderEvery>
			</section>
			{playerSide && <GameSide relative="player" cards={cards} side={playerSide} />}
		</div>
	);
}
