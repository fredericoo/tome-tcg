import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import { cva } from 'cva';
import { motion } from 'framer-motion';
import { useRef } from 'react';

import { Badge } from '../components/badge';
import { getCardImageSrc, isShownCard } from '../components/game/card';
import { CardPile } from '../components/game/card-pile';
import { Chat } from '../components/game/chat';
import { PlayerActionOverlay } from '../components/game/player-action-overlay';
import { PlayerHand } from '../components/game/player-hand';
import { PlayerSide } from '../components/game/player-side';
import { TurnPhaseMeter } from '../components/game/turn-phase-meter';
import { VfxCanvas } from '../components/game/vfx-canvas';
import { Image } from '../components/image';
import { api } from '../lib/api';
import { CardDataProvider, useCardData } from '../lib/card-data';
import { useGameStore, useGameSub } from '../lib/game.utils';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

export const clientLoader = (async ({ params }) => {
	const gameId = params.id;
	if (!gameId) return redirect('/games');

	const { data, error } = await api.games({ id: gameId }).get();
	if (error) throw error;

	return data;
}) satisfies ClientLoaderFunction;

const middleSectionClass = cva({
	base: 'flex flex-grow items-center justify-center relative',
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

const MiddleSection = () => {
	const cardData = useCardData();
	const field = useGameStore(s => s.state?.board.field);
	const sideACastingField = useGameStore(s => s.state?.board.sideA.casting.field);
	const sideBCastingField = useGameStore(s => s.state?.board.sideB.casting.field);
	const activeFieldCard = field?.at(-1);
	const activeFieldCardData =
		activeFieldCard && isShownCard(activeFieldCard) ? cardData[activeFieldCard.id] : undefined;
	const activeColor = activeFieldCardData?.type === 'field' ? activeFieldCardData.color ?? undefined : undefined;

	return (
		<section className={middleSectionClass({ active: activeColor })}>
			{activeFieldCard && isShownCard(activeFieldCard) && (
				<motion.div
					key={activeFieldCard.id}
					initial={{ opacity: 0, scale: 0 }}
					animate={{ opacity: 0.3, scale: 1 }}
					className="pointer-events-none absolute inset-0 z-0"
				>
					<Image
						src={getCardImageSrc(activeFieldCard.id)}
						className=" h-full w-full scale-125 object-cover blur-xl"
						srcWidth="100vw"
					/>
				</motion.div>
			)}

			<div className="flex flex-1"></div>

			<CardPile cards={field ?? []} last={2} size="sm" />
			{sideACastingField && (
				<div className="pointer-events-none absolute -translate-x-1/2">
					<CardPile cards={sideACastingField} size="sm" last={sideACastingField.length} />
				</div>
			)}
			{sideBCastingField && (
				<div className="pointer-events-none absolute translate-x-1/2">
					<CardPile cards={sideBCastingField} size="sm" last={sideBCastingField.length} />
				</div>
			)}
			<TurnPhaseMeter />
		</section>
	);
};

const Ping = () => {
	const sentAt = useGameStore(s => s.state?.sentAt);
	if (!sentAt) return null;
	const now = Date.now();
	const ping = sentAt ? now - sentAt : undefined;
	if (!ping) return null;
	return <div className="label-xs text-neutral-10 px-2">{Math.abs(ping)}ms</div>;
};

export default function Page() {
	const { game, cards: cardData } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub } = useGameSub(game.id);
	const boardRef = useRef<HTMLDivElement>(null);
	return (
		<CardDataProvider value={cardData}>
			<div ref={boardRef} className="bg-accent-1 relative flex h-screen w-full flex-col overflow-hidden">
				<PlayerActionOverlay />
				<Chat sides={game} />

				<nav className="rounded-2 ring-accent-11/5 shadow-surface-md surface-neutral absolute left-2 top-2 z-50 flex items-center gap-2 bg-white p-2 ring-1">
					<Badge colorScheme={status === 'connected' ? 'positive' : 'negative'}>{status}</Badge>
					<Ping />
					{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
				</nav>

				<PlayerHand onSelectFromHand={p => sub?.send(p)} relative="opponent" />
				<PlayerSide onSelectStack={p => sub?.send(p)} relative="opponent" />

				<MiddleSection />

				<PlayerSide onSelectStack={p => sub?.send(p)} relative="self" />
				<PlayerHand onSelectFromHand={p => sub?.send(p)} relative="self" />
			</div>
			<VfxCanvas boardRef={boardRef.current} />
		</CardDataProvider>
	);
}
