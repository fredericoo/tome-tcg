import { IconBook } from '@tabler/icons-react';
import { MotionValue, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';

import { DbCard } from '../../../../tome-api/src/features/engine/engine.game';
import { PubSubCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { CardDataProvider } from '../../lib/card-data';
import { Card } from '../game/card';

type GuideStep = {
	heading: string;
	description: string;
};
const makeGuideSteps = <TStepName extends string>(steps: (GuideStep & { id: TStepName })[]) => steps;

const steps = makeGuideSteps([
	{
		id: 'draw',
		heading: 'Draw a card',
		description: '',
	},
	{
		id: 'place',
		heading: 'Each player places one secret card into play',
		description: 'Prepare a spell, or set the field to benefit your strategy',
	},
	{
		id: 'turns',
		heading: 'Reveal you card',
		description: 'Turns are simultaneous: both players play and reveal together',
	},
	{
		id: 'cast',
		heading: 'Cast a spell upon your opponent',
		description: 'Choose one of the three stack colours to attack your opponent',
	},
	{
		id: 'winner',
		heading: 'The winner deals damage',
		description: 'Red beats green, green beats blue, blue beats red.',
	},
	{ id: 'effects', heading: 'Abuse card effects', description: 'Card effects may turn the game around — have fun!' },
]);

const cardData: Record<number, DbCard> = {
	0: { id: '', colors: ['red'], name: 'Test card', attack: 10, type: 'spell', effects: {}, description: 'Test' },
	1: { id: '', colors: ['green'], name: 'Test card', attack: 10, type: 'spell', effects: {}, description: 'Test' },
	2: { id: '', colors: ['blue'], name: 'Test card', attack: 10, type: 'spell', effects: {}, description: 'Test' },
	3: {
		id: '',
		colors: ['red', 'green'],
		name: 'Test card',
		attack: 10,
		type: 'spell',
		effects: {},
		description: 'Test',
	},
	4: { id: '', colors: [], name: 'Test card', attack: 10, type: 'spell', effects: {}, description: 'Test' },
};

const progressRange = steps.map((_, i) => i / (steps.length - 1));
const OpponentHand = ({ progress }: { progress: MotionValue<number> }) => {
	const deckY = useTransform(progress, progressRange, [-100, -100, -200, -200, -200, -200]);

	return (
		<motion.div style={{ y: deckY }} className="flex justify-center">
			{Array.from({ length: 5 }).map((_, i) => {
				const fanRatio = -1.5;
				const rotate = (i + 0.5 - 5 / 2) * fanRatio;
				const y = Math.abs(rotate) * fanRatio * 5;
				return (
					<motion.div style={{ y, rotate }} key={i} className="-mx-4 h-32">
						<Card card={{ key: 1 }} size="md" />
					</motion.div>
				);
			})}
		</motion.div>
	);
};

const OwnerHand = ({ progress }: { progress: MotionValue<number> }) => {
	const multiplier = 1;
	const deckY = useTransform(progress, progressRange, [0, 30, -30, 60, 0, 0]);

	const [deck, setDeck] = useState<PubSubCard[]>([
		{ key: 1, id: '0' },
		{ key: 2, id: '1' },
		{ key: 3, id: '2' },
		{ key: 4, id: '3' },
		{ key: 5, id: '4' },
	]);
	useMotionValueEvent(progress, 'change', progress => {
		if (progress >= 1 / steps.length) {
			if (deck[2] && 'id' in deck[2]) {
				setDeck([{ key: 1, id: '0' }, { key: 2, id: '1' }, { key: 3 }, { key: 4, id: '3' }, { key: 5, id: '4' }]);
			}
		} else {
			if (deck[2] && !('id' in deck[2])) {
				setDeck([
					{ key: 1, id: '0' },
					{ key: 2, id: '1' },
					{ key: 3, id: '2' },
					{ key: 4, id: '3' },
					{ key: 5, id: '4' },
				]);
			}
		}
	});
	const mainCardY = useTransform(progress, progressRange, [0, -140, -80, 0, 0, 0]);

	return (
		<motion.div style={{ y: deckY }} className="flex justify-center">
			{deck.map((pubsubCard, i) => {
				const fanRatio = 1.5 * multiplier;
				const rotateZ = (i + 0.5 - 5 / 2) * fanRatio;
				const y = i === 2 ? mainCardY : Math.abs(rotateZ) * fanRatio * 5;

				return (
					<motion.div style={{ y, rotateZ }} key={i} className="-mx-4 h-32">
						<Card card={pubsubCard} size="md" />
					</motion.div>
				);
			})}
		</motion.div>
	);
};

export const Guide = () => {
	const container = useRef<HTMLUListElement>(null);
	const { scrollXProgress } = useScroll({ axis: 'x', container });

	return (
		<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
			<header className="flex gap-2 p-2">
				<IconBook /> <h1 className="heading-sm">Learn Tome in 30 seconds</h1>
			</header>
			<div className="bg-lowest rounded-4 shadow-surface-md surface-neutral ring-neutral-9/10 relative ring-1">
				<div className="pointer-events-none absolute w-full p-4">
					<div className="bg-accent-3 rounded-1 aspect-video overflow-hidden">
						<CardDataProvider value={cardData}>
							<div className="flex flex-col items-center gap-8 [perspective:800px]">
								<OpponentHand progress={scrollXProgress} />
								<OwnerHand progress={scrollXProgress} />
							</div>
						</CardDataProvider>
					</div>
				</div>
				<ul
					ref={container}
					className="hide-scrollbars flex overflow-x-auto scroll-smooth [scroll-snap-stop:always] [scroll-snap-type:x_mandatory]"
				>
					{steps.map((step, i) => (
						<li
							data-step={i}
							className="flex w-full shrink-0 flex-col gap-4 p-4 [scroll-snap-align:start]"
							key={step.id}
						>
							<div className="aspect-video"></div>
							<div>
								<p className="heading-md text-balance">{step.heading}</p>
								<p className="body-sm text-neutral-11 text-pretty">{step.description}</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
};
