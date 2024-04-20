import clsx from 'clsx';
import { ComponentPropsWithoutRef } from 'react';

import { CardSlug } from '../../../../tome-api/src/features/card/card.db';
import { COLORS } from '../../../../tome-api/src/features/engine/engine.game';
import { CardData } from '../../lib/card-data';
import { cardColorClass } from '../game/card';

// adds zero padding to a number, wrapping it in a span
const NumberWithPadding = ({ children, minDigits }: { children: number; minDigits: number }) => {
	const str = children.toString();
	const padding = '0'.repeat(Math.max(0, minDigits - str.length));
	return (
		<span className={clsx({ 'opacity-20': children === 0 })}>
			{padding}
			{str}
		</span>
	);
};

interface DeckColorCountsProps extends ComponentPropsWithoutRef<'ul'> {
	cardData: CardData;
	cardsList: CardSlug[];
}

export const DeckColorCounts = ({ cardData, cardsList, className, ...props }: DeckColorCountsProps) => {
	const { red, green, blue, neutral } = cardsList.reduce(
		(acc, id) => {
			const card = cardData[id];
			if (!card) return acc;

			if (card.type === 'field') {
				acc[card.color ?? 'neutral']++;
			} else {
				if (card.colors.length === 0) acc.neutral++;
				COLORS.forEach(color => {
					if (card.colors.includes(color)) acc[color]++;
				});
			}
			return acc;
		},
		{ red: 0, green: 0, blue: 0, neutral: 0 },
	);

	return (
		<ul className={clsx('label-xs flex flex-wrap items-center gap-3 tabular-nums', className)} {...props}>
			<li className="flex items-center gap-1">
				<div className={cardColorClass({ color: 'red', className: 'h-2 w-2 rounded-full bg-current' })} />
				<span className="sr-only">Red cards:</span>
				<NumberWithPadding minDigits={2}>{red}</NumberWithPadding>
			</li>
			<li className="flex items-center gap-1">
				<div className={cardColorClass({ color: 'green', className: 'h-2 w-2 rounded-full bg-current' })} />
				<span className="sr-only">Green cards:</span>
				<NumberWithPadding minDigits={2}>{green}</NumberWithPadding>
			</li>
			<li className="flex items-center gap-1">
				<div className={cardColorClass({ color: 'blue', className: 'h-2 w-2 rounded-full bg-current' })} />
				<span className="sr-only">Blue cards:</span>
				<NumberWithPadding minDigits={2}>{blue}</NumberWithPadding>
			</li>
			<li className="flex items-center gap-1">
				<div className="bg-neutral-9 h-2 w-2 rounded-full" />
				<span className="sr-only">Neutral cards:</span>
				<NumberWithPadding minDigits={2}>{neutral}</NumberWithPadding>
			</li>
		</ul>
	);
};
