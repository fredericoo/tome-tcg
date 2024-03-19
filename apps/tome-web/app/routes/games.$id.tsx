import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { cva } from 'cva';
import { motion } from 'framer-motion';
import { ComponentPropsWithoutRef, useMemo } from 'react';
import { create } from 'zustand';

import { type DbCard, STACKS, type Side } from '../../../tome-api/src/features/engine/engine.game';
import type {
	CastFromHandMessageSchema,
	PubSubCard,
	SanitisedIteration,
} from '../../../tome-api/src/features/game/game.pubsub';
import { Card, CardProps, cardClass } from '../components/card';
import { RerenderEvery } from '../components/rerender-every';
import { api } from '../lib/api';
import { useGameSub } from '../lib/game.utils';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

type CardData = Record<string, Pick<DbCard, 'name' | 'description' | 'type'>>;

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

interface CardPileProps extends ComponentPropsWithoutRef<'div'> {
	cards: PubSubCard[];
	cardData: CardData;
	last: number;
	size: CardProps['size'];
}

const CardPile = ({ cards, cardData, last = 5, size = 'md' }: CardPileProps) => {
	return (
		<div className="relative">
			<ol className={cardClass({ size, variant: 'placeholder', className: 'grid' })}>
				{
					// we only add the last N cards onto the dom to avoid excessive dom nodes
					cards.slice(-last).map(cardRef => (
						<li className="col-end-1 row-end-1" key={cardRef.key}>
							<Card size={size} layoutId={cardRef.key} data={cardRef.id ? cardData[cardRef.id] : undefined} />
						</li>
					))
				}
			</ol>
			{cards.length > 0 && (
				<p
					aria-label="Cards in pile"
					className="absolute -right-1 -top-1 inline-block rounded-full bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-50"
				>
					{cards.length}
				</p>
			)}
		</div>
	);
};

type ActionType = NonNullable<SanitisedIteration['board'][Side]['action']>['type'];
const selectFromHandTypes = ['cast_from_hand', 'select_from_hand'] as const satisfies ActionType[];

const stackClass = cva({
	base: 'rounded-xl shadow-inner p-2',
	variants: { stack: { red: 'bg-red-200', green: 'bg-green-200', blue: 'bg-blue-200' } },
});

interface PlayerSideProps {
	side: SanitisedIteration['board'][Side];
	cardData: Record<string, Pick<DbCard, 'name' | 'description' | 'type'>>;
	relative: 'opponent' | 'player';
	onSelectFromHand: (actionType: ActionType, cardKey: number) => void;
}

const PlayerSide = ({ side, cardData, relative, onSelectFromHand }: PlayerSideProps) => {
	const selectCallback = useMemo(() => {
		if (!side.action) return undefined;
		if (selectFromHandTypes.includes(side.action.type)) {
			return (card: PubSubCard) => {
				if (!side.action) return undefined;
				return onSelectFromHand(side.action.type, card.key);
			};
		}
	}, [onSelectFromHand, side.action]);

	return (
		<div className={clsx('flex flex-col items-center', { 'flex-col-reverse': relative === 'opponent' })}>
			<ol aria-label="Stacks" className="flex gap-4 p-4">
				{STACKS.map(stack => {
					const casting = side.casting[stack];
					return (
						<li aria-label={stack} key={stack} className={stackClass({ stack })}>
							{casting && (
								<div className="absolute translate-y-1/2">
									<Card size="sm" layoutId={casting.key} data={casting.id ? cardData[casting.id] : undefined} />
								</div>
							)}
							<CardPile cardData={cardData} cards={side.stacks[stack]} last={2} size="sm" />
						</li>
					);
				})}
			</ol>

			<div
				className={clsx('flex w-full justify-start p-4', {
					'flex-row-reverse': relative === 'opponent',
				})}
			>
				<CardPile aria-label="Draw pile" cardData={cardData} cards={side.drawPile} last={2} size="sm" />
				<RerenderEvery seconds={0.5}>
					{() => {
						const action = side?.action;
						if (!action) return null;
						const date = new Date(action.timesOutAt);
						// return seconds remaining
						return <p className="p-4">{Math.floor((date.getTime() - Date.now()) / 1000)}s</p>;
					}}
				</RerenderEvery>
			</div>

			<ol
				aria-label="Hand"
				className={clsx('absolute left-1/2 flex flex-grow -translate-x-1/2  justify-center p-2', {
					'bottom-0 translate-y-1/4': relative === 'player',
					'top-0 -translate-y-1/4': relative === 'opponent',
				})}
			>
				{side.hand.map((cardRef, index) => {
					// fan out the cards
					const fanRatio = 2 * (relative === 'player' ? 1 : -1);
					const angle = (index + 0.5 - side.hand.length / 2) * fanRatio;
					const y = Math.cos(Math.abs(angle) / fanRatio) * -10 * fanRatio;
					return (
						<motion.li
							animate={{ marginInline: '-10px', transform: `rotate(${angle}deg) translateY(${y}px)` }}
							key={cardRef.key}
						>
							<Card
								interactive={Boolean(selectCallback) && relative === 'player'}
								onClick={selectCallback ? () => selectCallback(cardRef) : undefined}
								size={relative === 'player' ? 'md' : 'sm'}
								layoutId={cardRef.key}
								data={cardRef.id ? cardData[cardRef.id] : undefined}
							/>
						</motion.li>
					);
				})}
			</ol>
		</div>
	);
};

type HighlightedCardsStore = {
	highlightedCards: SanitisedIteration['board']['highlights'] | undefined;
	setHighlightedCards: (highlights: SanitisedIteration['board']['highlights'] | undefined) => void;
};
const useHighlightedCardsStore = create<HighlightedCardsStore>(() => ({
	highlightedCards: undefined,
	setHighlightedCards: () => {},
}));
export const useCardHighlight = (cardKey: number) => {
	return useHighlightedCardsStore(state => state.highlightedCards?.[cardKey]);
};

export default function Page() {
	const { game, cards } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData, error } = useGameSub(game.id.toString());
	const setHighlightedCards = useHighlightedCardsStore(state => state.setHighlightedCards);
	setHighlightedCards(latestData?.board.highlights);
	const playerSide = latestData?.board[latestData.side];
	const opponentSide = latestData?.board[latestData.side === 'sideA' ? 'sideB' : 'sideA'];
	const castingField = [latestData?.board.sideA.casting.field, latestData?.board.sideB.casting.field].filter(Boolean);
	const onSelectFromHand: PlayerSideProps['onSelectFromHand'] = (type, cardKey) => {
		switch (type) {
			case 'cast_from_hand': {
				const payload: CastFromHandMessageSchema = { cardKey, stack: 'red', type };
				return sub?.send(payload);
			}
			default:
				throw new Error('Not implemented');
		}
	};
	return (
		<div className="relative flex h-screen w-full flex-col overflow-hidden bg-neutral-100">
			{opponentSide && (
				<PlayerSide onSelectFromHand={onSelectFromHand} relative="opponent" cardData={cards} side={opponentSide} />
			)}

			<nav className="absolute left-2 top-2 rounded-lg bg-white px-4 py-2 text-center shadow-lg">
				Phase: {latestData?.board.phase}
				<span>status: {status}</span>
				{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
				{status === 'connected' && <button onClick={() => sub?.close()}>Disconnect</button>}
				{error && <span className="rounded-full bg-red-500 px-2 py-1">{error}</span>}
			</nav>

			<section className="flex flex-grow justify-center">
				<CardPile cards={latestData?.board.field ?? []} cardData={cards} last={2} size="sm" />
				{castingField && (
					<div className="absolute translate-y-1/2">
						{castingField.map(castingCard => (
							<Card
								key={castingCard.key}
								size="sm"
								layoutId={castingCard.key}
								data={castingCard.id ? cards[castingCard.id] : undefined}
							/>
						))}
					</div>
				)}
			</section>

			{playerSide && (
				<PlayerSide onSelectFromHand={onSelectFromHand} relative="player" cardData={cards} side={playerSide} />
			)}
		</div>
	);
}
