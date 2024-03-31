import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { cva } from 'cva';
import { AnimationSequence, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { Board } from '../../../tome-api/src/features/engine/engine.board';
import type { CompressedCombatStackItem, SanitisedIteration } from '../../../tome-api/src/features/game/game.pubsub';
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

type CombatStackStore = {
	combatStack: CompressedCombatStackItem[] | undefined;
	setCombatStack: (stack: CompressedCombatStackItem[] | undefined) => void;
};
export const useCombatStackStore = create<CombatStackStore>(set => ({
	combatStack: undefined,
	setCombatStack: stack => set({ combatStack: stack }),
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
								'text-xl': isCurrent,
								'text-xs opacity-60': !isCurrent,
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
function usePrevious<T>(value: T) {
	const ref = useRef<T>();
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref.current;
}

const CombatStackAnimation = () => {
	const combatStack = useCombatStackStore(s => s.combatStack);
	const previous = usePrevious(combatStack);

	useEffect(() => {
		if (combatStack && combatStack.length > 0) {
			if (combatStack.length === previous?.length) return;
			// animate the card to the target
			console.log(combatStack, previous);

			animate(
				combatStack
					.flatMap(combat => {
						if (!combat.sourceKey) return undefined;
						const card = document.querySelector(`#card-${combat.sourceKey}`);
						const target = document.querySelector(`#${combat.target}-hp`);
						if (!card || !target) return [];
						const seq: AnimationSequence = [
							[
								card,
								{
									x: target.getBoundingClientRect().left - card.getBoundingClientRect().left,
									y: target.getBoundingClientRect().top - card.getBoundingClientRect().top,
								},
							],
							[
								card,
								{
									x: 0,
									y: 0,
								},
							],
						];
						return seq;
					})
					.filter(Boolean),
			);
		}
	}, [combatStack, previous]);

	return null;
};

export default function Page() {
	const { game, cards: cardData } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData, error } = useGameSub(game.id.toString());

	const playerSide = latestData?.side;
	const playerBoard = playerSide ? latestData?.board[playerSide] : undefined;
	const opponentSide =
		latestData ?
			latestData.side === 'sideA' ?
				'sideB'
			:	'sideA'
		:	undefined;
	const opponentBoard = opponentSide ? latestData?.board[opponentSide] : undefined;

	return (
		<CardDataProvider value={cardData}>
			<CombatStackAnimation />
			<div className="relative flex h-screen w-full flex-col overflow-hidden bg-neutral-100">
				{playerBoard?.action && (
					<div className="animate-fade-in pointer-events-none fixed inset-0 z-20 flex w-full items-center justify-center bg-neutral-900/50 p-4">
						<p
							key={playerBoard.action.config.message}
							className="animate-action font-lg font-bold text-white [text-shadow:0px_1px_0_black]"
						>
							{playerBoard.action.config.message}
						</p>
					</div>
				)}
				<nav className="rounded-6 absolute left-2 top-2 bg-white px-4 py-2 text-center shadow-lg">
					<span>status: {status}</span>
					{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
					{status === 'connected' && <button onClick={() => sub?.close()}>Disconnect</button>}
					{error && <span className="rounded-full bg-red-500 px-2 py-1">{error}</span>}
				</nav>

				{opponentBoard && opponentSide && (
					<PlayerSide
						side={opponentSide}
						action={playerBoard?.action}
						onSelectFromHand={payload => sub?.send(payload)}
						onSelectStack={payload => sub?.send(payload)}
						relative="opponent"
						attackingWithStack={latestData?.board.attackStacks?.[opponentSide]}
						boardSide={opponentBoard}
					/>
				)}

				<MiddleSection latestData={latestData} />

				{playerBoard && playerSide && (
					<PlayerSide
						side={playerSide}
						action={playerBoard?.action}
						onSelectFromHand={payload => sub?.send(payload)}
						onSelectStack={payload => sub?.send(payload)}
						relative="self"
						attackingWithStack={latestData?.board.attackStacks?.[playerSide]}
						boardSide={playerBoard}
					/>
				)}
			</div>
		</CardDataProvider>
	);
}
