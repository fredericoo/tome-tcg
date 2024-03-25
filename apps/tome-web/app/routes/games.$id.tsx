import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { cva } from 'cva';
import { ComponentPropsWithoutRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { create } from 'zustand';

import {
	type DbCard,
	GameAction,
	STACKS,
	type Side,
	SpellStack,
} from '../../../tome-api/src/features/engine/engine.game';
import type {
	PubSubCard,
	SanitisedIteration,
	SelectFromHandMessageSchema,
	SelectStackMessageSchema,
} from '../../../tome-api/src/features/game/game.pubsub';
import { DistributiveOmit } from '../../../tome-api/src/lib/type-utils';
import { invariant } from '../../../tome-api/src/lib/utils';
import { AnimatedNumber } from '../components/animated-number';
import { Card, CardProps, cardClass } from '../components/card';
import { PlayerHand } from '../components/player-hand';
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
					×{cards.length}
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

const ActionProgressBar = ({ action }: { action?: GameAction }) => {
	if (!action) return <div className="relative h-1 w-full bg-neutral-200"></div>;
	const now = Date.now();
	const durationMs = action.timesOutAt - now;

	// return seconds remaining
	return (
		<div className="relative h-1 w-full bg-neutral-300">
			<div
				style={{ animationDuration: `${durationMs}ms` }}
				className="animate-to-zero-width absolute h-full rounded-full bg-teal-600"
			/>
		</div>
	);
};
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
		<div className={clsx('flex flex-col items-center gap-2', { 'flex-col-reverse': relative === 'opponent' })}>
			<ActionProgressBar action={side.action} />

			<div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-neutral-900/20">
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M1.35248 4.90532C1.35248 2.94498 2.936 1.35248 4.89346 1.35248C6.25769 1.35248 6.86058 1.92336 7.50002 2.93545C8.13946 1.92336 8.74235 1.35248 10.1066 1.35248C12.064 1.35248 13.6476 2.94498 13.6476 4.90532C13.6476 6.74041 12.6013 8.50508 11.4008 9.96927C10.2636 11.3562 8.92194 12.5508 8.00601 13.3664C7.94645 13.4194 7.88869 13.4709 7.83291 13.5206C7.64324 13.6899 7.3568 13.6899 7.16713 13.5206C7.11135 13.4709 7.05359 13.4194 6.99403 13.3664C6.0781 12.5508 4.73641 11.3562 3.59926 9.96927C2.39872 8.50508 1.35248 6.74041 1.35248 4.90532Z"
						fill="currentColor"
						fillRule="evenodd"
						clipRule="evenodd"
					></path>
				</svg>
				<AnimatedNumber className="text-md font-bold tracking-tight">{side.hp}</AnimatedNumber>
			</div>

			{isSelectingStack && <div className="pointer-events-none fixed inset-0 z-10 bg-neutral-900/50" />}
			<ol aria-label="Stacks" className={clsx('flex gap-4 px-4')}>
				{STACKS.map(stack => {
					const canSelectStack = isSelectingStack && action.config.availableStacks.includes(stack);
					const casting = side.casting[stack];
					return (
						<li key={stack}>
							<button
								disabled={!canSelectStack}
								aria-label={stack}
								onClick={
									canSelectStack ?
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
								className={stackClass({
									stack,
									interactive: canSelectStack,
									className: clsx({ 'relative z-20': canSelectStack }),
								})}
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
				className={clsx('flex w-full justify-between p-4', {
					'flex-row-reverse items-start': relative === 'opponent',
					'items-end': relative === 'self',
				})}
			>
				<CardPile aria-label="Draw pile" cardData={cardData} cards={side.drawPile} last={2} size="sm" />
			</div>

			<PlayerHand
				side={side}
				cardData={cardData}
				action={action}
				onSelectFromHand={onSelectFromHand}
				relative={relative}
			/>
		</div>
	);
};

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
export default function Page() {
	const { game, cards } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub, latestData, error } = useGameSub(game.id.toString());

	const playerSide = latestData?.board[latestData.side];
	const opponentSide = latestData?.board[latestData.side === 'sideA' ? 'sideB' : 'sideA'];

	const activeFieldCard = latestData?.board.field.at(-1);
	const activeFieldCardData = activeFieldCard?.id ? cards[activeFieldCard.id] : undefined;
	const activeColor = activeFieldCardData?.type === 'field' ? activeFieldCardData.color ?? undefined : undefined;

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
				<span>status: {status}</span>
				{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
				{status === 'connected' && <button onClick={() => sub?.close()}>Disconnect</button>}
				{error && <span className="rounded-full bg-red-500 px-2 py-1">{error}</span>}
			</nav>

			<section className={fieldClass({ active: activeColor })}>
				<CardPile cards={latestData?.board.field ?? []} cardData={cards} last={2} size="sm" />
				{latestData?.board.sideA.casting.field && (
					<div className="absolute -translate-x-1/2">
						<Card
							key={latestData.board.sideA.casting.field.key}
							size="sm"
							layoutId={latestData.board.sideA.casting.field.key}
							data={
								latestData.board.sideA.casting.field.id ? cards[latestData.board.sideA.casting.field.id] : undefined
							}
						/>
					</div>
				)}
				{latestData?.board.sideB.casting.field && (
					<div className="absolute translate-x-1/2">
						<Card
							key={latestData.board.sideB.casting.field.key}
							size="sm"
							layoutId={latestData.board.sideB.casting.field.key}
							data={
								latestData.board.sideB.casting.field.id ? cards[latestData.board.sideB.casting.field.id] : undefined
							}
						/>
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

			{playerSide?.action?.config.message && (
				<div className="pointer-events-none fixed inset-0 z-20 flex w-full items-center justify-center p-4">
					<p className="font-lg font-bold text-white [text-shadow:0px_1px_0_black]">
						{playerSide?.action.config.message}
					</p>
				</div>
			)}
		</div>
	);
}
