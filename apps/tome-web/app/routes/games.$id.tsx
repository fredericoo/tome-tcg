import type { MetaFunction } from '@remix-run/node';
import { cva } from 'cva';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { invariant } from '../../../tome-api/src/lib/utils';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { CardDetailsOverlay } from '../components/card-details-overlay';
import { ActiveFieldBg } from '../components/game/active-field-bg';
import { isShownCard } from '../components/game/card';
import { CardPile } from '../components/game/card-pile';
import { Chat } from '../components/game/chat';
import { Ping } from '../components/game/ping';
import { PlayerActionOverlay } from '../components/game/player-action-overlay';
import { PlayerHand } from '../components/game/player-hand';
import { PlayerSide } from '../components/game/player-side';
import { TurnPhaseMeter } from '../components/game/turn-phase-meter';
import { VfxCanvas } from '../components/game/vfx-canvas';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { api, getDataOrThrow } from '../lib/api';
import { CardDataProvider, useCardData } from '../lib/card-data';
import { GameProvider, useGameStore, useGameSub } from '../lib/game.utils';

export const meta: MetaFunction = () => {
	return [{ title: 'Games' }, { name: 'description', content: ':)' }];
};

const getGameById = (id: string) => api.games({ id }).get().then(getDataOrThrow);
type GameData = Awaited<ReturnType<typeof getGameById>>;

export const clientLoader = (async ({ params }) => {
	const gameId = params.id;
	invariant(typeof gameId === 'string', 'Game ID must be a string');

	return defer({
		game: getGameById(gameId),
		cardData: api.cards.index.get().then(getDataOrThrow),
	});
}) satisfies LoaderFunction;

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
	const sideACastingField = useGameStore(s => s.state?.board.sideA.casting.field);
	const sideBCastingField = useGameStore(s => s.state?.board.sideB.casting.field);
	const field = useGameStore(s => s.state?.board.field);
	const activeFieldCard = field?.at(-1);
	const activeFieldCardData =
		activeFieldCard && isShownCard(activeFieldCard) ? cardData[activeFieldCard.id] : undefined;
	const activeColor = activeFieldCardData?.type === 'field' ? activeFieldCardData.color ?? undefined : undefined;

	return (
		<section className={middleSectionClass({ active: activeColor })}>
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

const Game = ({ game }: { game: GameData }) => {
	const { reconnect, status, sub } = useGameSub(game.id);

	return (
		<div className="flex h-[100lvh] h-screen">
			<div className="bg-accent-1 relative flex h-full w-full flex-shrink flex-grow flex-col gap-2 overflow-hidden">
				<ActiveFieldBg />
				<PlayerActionOverlay />

				<PlayerHand onSelectFromHand={m => sub?.send(m)} relative="opponent" />
				<PlayerSide onSelectStack={m => sub?.send(m)} relative="opponent" />

				<MiddleSection />

				<PlayerSide onSelectStack={m => sub?.send(m)} relative="self" />
				<PlayerHand onSelectFromHand={m => sub?.send(m)} relative="self" />

				<VfxCanvas />
			</div>
			<div className="relative hidden h-full w-full max-w-md flex-grow flex-col md:flex">
				<nav className="bg-neutral-11 flex h-16 items-center justify-end gap-2 px-4">
					<Ping />
					{status === 'disconnected' && (
						<Button variant="outline" size="sm" onClick={reconnect}>
							Reconnect
						</Button>
					)}
					<Badge colorScheme={status === 'connected' ? 'positive' : 'negative'}>{status}</Badge>
				</nav>
				<Chat sides={game} />
			</div>
		</div>
	);
};

export default function Page() {
	const { game, cardData } = useLoaderData<typeof clientLoader>();

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Await resolve={cardData} errorElement={<GenericErrorBoundary />}>
				{cardData => (
					<Await resolve={game} errorElement={<GenericErrorBoundary />}>
						{game => (
							<CardDataProvider value={cardData}>
								<GameProvider initialValue={undefined}>
									<Game game={game} />
									<CardDetailsOverlay />
								</GameProvider>
							</CardDataProvider>
						)}
					</Await>
				)}
			</Await>
		</Suspense>
	);
}
