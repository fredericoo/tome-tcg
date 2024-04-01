import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunction, redirect, useLoaderData } from '@remix-run/react';
import { IconExclamationCircle } from '@tabler/icons-react';
import { cva } from 'cva';

import { Badge } from '../components/badge';
import { Card, getCardImageSrc, isShownCard } from '../components/game/card';
import { CardPile } from '../components/game/card-pile';
import { PlayerActionOverlay } from '../components/game/player-action-overlay';
import { PlayerHand } from '../components/game/player-hand';
import { PlayerSide } from '../components/game/player-side';
import { TurnPhaseMeter } from '../components/game/turn-phase-meter';
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

const fieldClass = cva({
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
		<section className={fieldClass({ active: activeColor })}>
			{activeFieldCardData?.image && (
				<Image
					src={getCardImageSrc(activeFieldCardData.image)}
					className="absolute inset-0 z-0 h-full w-full scale-125 object-cover opacity-30 blur-xl"
					srcWidth="100vw"
				/>
			)}
			<div className="flex-1" />
			<CardPile cards={field ?? []} last={2} size="sm" />
			{sideACastingField && (
				<div className="absolute -translate-x-1/2">
					<Card key={sideACastingField.key} size="sm" card={sideACastingField} />
				</div>
			)}
			{sideBCastingField && (
				<div className="absolute translate-x-1/2">
					<Card key={sideBCastingField.key} size="sm" card={sideBCastingField} />
				</div>
			)}
			<TurnPhaseMeter />
		</section>
	);
};

// function usePrevious<T>(value: T) {
// 	const ref = useRef<T>();
// 	useEffect(() => {
// 		ref.current = value;
// 	}, [value]);
// 	return ref.current;
// }

// const CombatStackAnimation = () => {
// 	const combatStack = useCombatStackStore(s => s.combatStack);
// 	const previous = usePrevious(combatStack);

// 	useEffect(() => {
// 		if (combatStack && combatStack.length > 0) {
// 			if (combatStack.length === previous?.length) return;
// 			// animate the card to the target
// 			console.log(combatStack, previous);

// 			animate(
// 				combatStack
// 					.flatMap(combat => {
// 						if (!combat.sourceKey) return undefined;
// 						const card = document.querySelector(`#stack-${combat.sourceKey}`);
// 						const target = document.querySelector(`#${combat.target}-hp`);
// 						if (!card || !target) return [];
// 						const seq: AnimationSequence = [
// 							[
// 								card,
// 								{
// 									x: target.getBoundingClientRect().left - card.getBoundingClientRect().left,
// 									y: target.getBoundingClientRect().top - card.getBoundingClientRect().top,
// 								},
// 							],
// 							[
// 								card,
// 								{
// 									x: 0,
// 									y: 0,
// 								},
// 							],
// 						];
// 						return seq;
// 					})
// 					.filter(Boolean),
// 			);
// 		}
// 	}, [combatStack, previous]);

// 	return null;
// };

const GameError = () => {
	const error = useGameStore(s => s.error);
	if (!error) return null;

	return (
		<div className="bg-negative-8 p-2 text-center text-white">
			<IconExclamationCircle /> <span>{error}</span>
		</div>
	);
};

export default function Page() {
	const { game, cards: cardData } = useLoaderData<typeof clientLoader>();
	const { reconnect, status, sub } = useGameSub(game.id);

	return (
		<CardDataProvider value={cardData}>
			<div className="bg-accent-1 relative flex h-screen w-full flex-col overflow-hidden">
				<PlayerActionOverlay />

				<nav className="rounded-6 shadow-surface-md surface-neutral absolute left-2 top-2 bg-white p-2 text-center">
					<Badge colorScheme={status === 'connected' ? 'positive' : 'negative'}>{status}</Badge>
					{status === 'disconnected' && <button onClick={reconnect}>Reconnect</button>}
					<GameError />
				</nav>

				<PlayerHand onSelectFromHand={p => sub?.send(p)} relative="opponent" />
				<PlayerSide onSelectStack={p => sub?.send(p)} relative="opponent" />

				<MiddleSection />

				<PlayerSide onSelectStack={p => sub?.send(p)} relative="self" />
				<PlayerHand onSelectFromHand={p => sub?.send(p)} relative="self" />
			</div>
		</CardDataProvider>
	);
}
