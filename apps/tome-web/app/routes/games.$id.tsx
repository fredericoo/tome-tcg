import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { cva } from 'cva';
import { create } from 'zustand';

import { Board } from '../../../tome-api/src/features/engine/engine.board';
import type { SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
import { Card, isShownCard } from '../components/game/card';
import { CardPile } from '../components/game/card-pile';
import { PlayerSide } from '../components/game/player-side';
import { api } from '../lib/api';
import { CardDataProvider, useCardData } from '../lib/card-data';
import { useGameSub } from '../lib/game.utils';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

const PHASES: Array<Board['phase']> = ['draw', 'cast', 'reveal', 'spell', 'combat', 'damage'];

export const clientLoader = (async ({ params }) => {
	const gameId = params.id;
	if (!gameId) return redirect('/games');

	const { data, error } = await api.games({ id: gameId }).get();

	if (error) throw error;
	return data;
}) satisfies ClientLoaderFunction;

type HighlightedCardsStore = {
	highlightedCards: SanitisedIteration['board']['highlights'];
	setHighlightedCards: (highlights: SanitisedIteration['board']['highlights'] | undefined) => void;
};
export const useHighlightedCardsStore = create<HighlightedCardsStore>(set => ({
	highlightedCards: {},
	setHighlightedCards: highlights => set({ highlightedCards: highlights }),
}));

const fieldClass = cva({
	base: 'flex flex-grow items-center justify-center',
	variants: {
		active: {
			red: 'bg-red-100',
			green: 'bg-green-100',
			blue: 'bg-blue-100',
			none: 'bg-neutral-200',
		},
	},
	defaultVariants: {
		active: 'none',
	},
});

const MiddleSection = ({ latestData }: { latestData: SanitisedIteration | undefined }) => {
	const cardData = useCardData();
	const activeFieldCard = latestData?.board.field.at(-1);
	const activeFieldCardData =
		activeFieldCard && isShownCard(activeFieldCard) ? cardData[activeFieldCard.id] : undefined;
	const activeColor = activeFieldCardData?.type === 'field' ? activeFieldCardData.color ?? undefined : undefined;

	return (
		<section className={fieldClass({ active: activeColor })}>
			<div className="flex-1" />
			<CardPile cards={latestData?.board.field ?? []} last={2} size="sm" />
			{latestData?.board.sideA.casting.field && (
				<div className="absolute -translate-x-1/2">
					<Card key={latestData.board.sideA.casting.field.key} size="sm" card={latestData.board.sideA.casting.field} />
				</div>
			)}
			{latestData?.board.sideB.casting.field && (
				<div className="absolute translate-x-1/2">
					<Card key={latestData.board.sideB.casting.field.key} size="sm" card={latestData.board.sideB.casting.field} />
				</div>
			)}
			<ol aria-label="Turn phases" className="flex flex-1 flex-col items-end px-4">
				{PHASES.map(phase => {
					const isCurrent = phase === latestData?.board.phase;
					return (
						<li
							className={clsx('font-bold transition-all', {
								'text-2xl': isCurrent,
								'text-md opacity-60': !isCurrent,
							})}
							key={phase}
						>
							{phase}
						</li>
					);
				})}
			</ol>
		</section>
	);
};

export default function Page() {
	const { game, cards: cardData } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData, error } = useGameSub(game.id.toString());

	const playerSide = latestData?.board[latestData.side];
	const opponentSide = latestData?.board[latestData.side === 'sideA' ? 'sideB' : 'sideA'];

	return (
		<CardDataProvider value={cardData}>
			<div className="relative flex h-screen w-full flex-col overflow-hidden bg-neutral-100">
				{playerSide?.action?.config.message && (
					<div className="animate-fade-in pointer-events-none fixed inset-0 z-20 flex w-full items-center justify-center bg-neutral-900/50 p-4">
						<p
							key={playerSide?.action.config.message}
							className="animate-action font-lg font-bold text-white [text-shadow:0px_1px_0_black]"
						>
							{playerSide?.action.config.message}
						</p>
					</div>
				)}
				<nav className="absolute left-2 top-2 rounded-lg bg-white px-4 py-2 text-center shadow-lg">
					<span>status: {status}</span>
					{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
					{status === 'connected' && <button onClick={() => sub?.close()}>Disconnect</button>}
					{error && <span className="rounded-full bg-red-500 px-2 py-1">{error}</span>}
				</nav>

				{opponentSide && (
					<PlayerSide
						action={playerSide?.action}
						onSelectFromHand={payload => sub?.send(payload)}
						onSelectStack={payload => sub?.send(payload)}
						relative="opponent"
						side={opponentSide}
					/>
				)}

				<MiddleSection latestData={latestData} />

				{playerSide && (
					<PlayerSide
						action={playerSide?.action}
						onSelectFromHand={payload => sub?.send(payload)}
						onSelectStack={payload => sub?.send(payload)}
						relative="self"
						side={playerSide}
					/>
				)}
			</div>
		</CardDataProvider>
	);
}
