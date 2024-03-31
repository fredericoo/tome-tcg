import { IconBook } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { DbCard } from '../../../../tome-api/src/features/engine/engine.game';
import { CardDataProvider } from '../../lib/card-data';
import { Card } from '../game/card';

type GuideStep = {
	heading: string;
	description: string;
};
const makeGuideSteps = <TStepName extends string>(steps: (GuideStep & { id: TStepName })[]) => steps;

const steps = makeGuideSteps([
	{
		id: 'turns' as const,
		heading: 'Turns are simultaneous',
		description: 'Both players play their cards at the same time',
	},
	{
		id: 'place',
		heading: 'Place one card into play',
		description: 'Draw and prepare a spell, or set the field to benefit your strategy',
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

export const Guide = () => {
	const [currentStep, setCurrentStep] = useState(0);
	const calculateCurrentStep = (e: React.UIEvent<HTMLUListElement>) => {
		// loop through steps and find the one that is in view by the data-step attribute
		const newCurrentStep = Array.from(e.currentTarget.children).find(
			child => child.getBoundingClientRect().left >= e.currentTarget.clientWidth / 2,
		);
		if (newCurrentStep) setCurrentStep(Number(newCurrentStep.getAttribute('data-step')));
	};

	return (
		<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
			<header className="flex gap-2 p-2">
				<IconBook /> <h1 className="heading-sm">Learn Tome in 30 seconds</h1>
			</header>
			<div className="bg-lowest rounded-4 shadow-surface-md surface-neutral ring-neutral-9/10 relative ring-1">
				<div className="pointer-events-none absolute w-full p-4">
					<div className="bg-accent-3 rounded-1 aspect-video overflow-hidden">
						<CardDataProvider value={cardData}>
							{['other', 'self'].map(relative => (
								<div key={relative} className="flex justify-center">
									{Array.from({ length: 5 }).map((_, i) => {
										const multiplier = relative === 'self' ? 1 : -1;
										const fanRatio = 1.5 * multiplier;
										const angle = (i + 0.5 - 5 / 2) * fanRatio;
										const y = (() => {
											if (currentStep >= 1 && relative === 'other') return 200 * multiplier;
											if (currentStep >= 2) return 200 * multiplier;
											return (Math.abs(angle) * 10 + 10) * fanRatio;
										})();

										const card =
											relative === 'other' ? { key: 0 }
											: currentStep > 0 ? { key: 1, id: i }
											: { key: 1 };

										return (
											<motion.div
												initial={{ y: (Math.abs(angle) * 15 + 20) * fanRatio }}
												animate={{ y, rotate: angle }}
												key={i}
												className="-mx-4 h-32"
											>
												<Card card={card} size="md" />
											</motion.div>
										);
									})}
								</div>
							))}
						</CardDataProvider>
					</div>
				</div>
				<ul
					onScroll={calculateCurrentStep}
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
