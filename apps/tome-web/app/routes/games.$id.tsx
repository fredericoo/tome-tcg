import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { cva } from 'cva';
import { ComponentPropsWithoutRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { create } from 'zustand';

import { type DbCard, STACKS, type Side, SpellStack } from '../../../tome-api/src/features/engine/engine.game';
import type {
	PubSubCard,
	SanitisedIteration,
	SelectFromHandMessageSchema,
	SelectStackMessageSchema,
} from '../../../tome-api/src/features/game/game.pubsub';
import { DistributiveOmit } from '../../../tome-api/src/lib/type-utils';
import { invariant } from '../../../tome-api/src/lib/utils';
import { Card, CardProps, cardClass } from '../components/card';
import { PlayerHand } from '../components/player-hand';
import { RerenderEvery } from '../components/rerender-every';
import { api } from '../lib/api';
import { useGameSub } from '../lib/game.utils';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

type CardData = Record<string, DistributiveOmit<DbCard, 'effects'>>;

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

const stackClass = cva({
	base: 'rounded-xl shadow-inner p-2',
	variants: {
		stack: { red: 'bg-red-200', green: 'bg-green-200', blue: 'bg-blue-200' },
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/20 cursor-pointer transition-shadow',
		},
	},
});

interface PlayerSideProps {
	action: SanitisedIteration['board'][Side]['action'] | undefined;
	side: SanitisedIteration['board'][Side];
	cardData: Record<string, DistributiveOmit<DbCard, 'effects'>>;
	relative: 'opponent' | 'self';
	onSelectFromHand: (params: SelectFromHandMessageSchema) => void;
	onSelectStack: (params: SelectStackMessageSchema) => void;
}

const PlayerSide = ({ action, side, cardData, relative, onSelectFromHand, onSelectStack }: PlayerSideProps) => {
	const isSelectingStack = action?.type === 'select_spell_stack' && action?.config.from === relative;
	const [selectedStacks, setSelectedStacks] = useState<Set<SpellStack>>(new Set());
	if (selectedStacks.size > 0 && action?.type !== 'select_spell_stack') setSelectedStacks(new Set());

	return (
		<div className={clsx('flex flex-col items-center', { 'flex-col-reverse': relative === 'opponent' })}>
			{isSelectingStack && <div className="fixed inset-0 z-10 bg-neutral-900/50" />}
			<ol aria-label="Stacks" className={clsx('flex gap-4 p-4', { 'z-20': isSelectingStack })}>
				{STACKS.map(stack => {
					const casting = side.casting[stack];
					return (
						<li key={stack}>
							<button
								aria-label={stack}
								onClick={
									isSelectingStack ?
										() => {
											flushSync(() =>
												setSelectedStacks(set => {
													if (set.has(stack)) {
														set.delete(stack);
														return set;
													}
													return set.add(stack);
												}),
											);
											invariant(action?.type === 'select_spell_stack', 'Invalid action type');
											// TODO: implement non-automatically submitting cards when min/max is not 1
											// TODO: implement validation of available stacks
											if (selectedStacks.size >= action.config.min && selectedStacks.size <= action.config.max) {
												onSelectStack({ type: 'select_spell_stack', stacks: Array.from(selectedStacks) });
											}
										}
									:	undefined
								}
								className={stackClass({ stack, interactive: isSelectingStack })}
							>
								{casting && (
									<div className="absolute translate-y-1/2">
										<Card size="sm" layoutId={casting.key} data={casting.id ? cardData[casting.id] : undefined} />
									</div>
								)}
								<CardPile cardData={cardData} cards={side.stacks[stack]} last={2} size="sm" />
							</button>
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

			<PlayerHand side={side} cardData={cardData} onSelectFromHand={onSelectFromHand} relative={relative} />
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

	return (
		<div className="relative flex h-screen w-full flex-col overflow-hidden bg-neutral-100">
			{opponentSide && (
				<PlayerSide
					action={playerSide?.action}
					onSelectFromHand={payload => sub?.send(payload)}
					onSelectStack={payload => sub?.send(payload)}
					relative="opponent"
					cardData={cards}
					side={opponentSide}
				/>
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
				<PlayerSide
					action={playerSide?.action}
					onSelectFromHand={payload => sub?.send(payload)}
					onSelectStack={payload => sub?.send(payload)}
					relative="self"
					cardData={cards}
					side={playerSide}
				/>
			)}
		</div>
	);
}
