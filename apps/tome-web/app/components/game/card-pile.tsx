import { IconCards } from '@tabler/icons-react';
import clsx from 'clsx';
import { CSSProperties, ComponentPropsWithoutRef } from 'react';

import type { PubSubCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { Badge } from '../badge';
import { Card, CardProps, cardSizeToClass } from './card';

interface CardPileProps extends ComponentPropsWithoutRef<'div'> {
	cards: PubSubCard[];
	last: number;
	size: CardProps['size'];
	variant?: 'stack' | 'pile' | 'scattered';
}

const GOLDEN_ANGLE = 137.508;

const getVariantStyle: Record<NonNullable<CardPileProps['variant']>, (index: number) => CSSProperties> = {
	stack: () => ({}),
	pile: i => ({ transform: `translateY(${-i}px)` }),
	scattered: i => ({ transform: `rotate(${i * GOLDEN_ANGLE})` }),
};

export const CardPile = ({ cards, last = 5, size = 'md', variant = 'stack' }: CardPileProps) => {
	return (
		<div className="pointer-events-none relative">
			<ol className={clsx(cardSizeToClass[size], 'grid')}>
				{
					// we only add the last N cards onto the dom to avoid excessive dom nodes
					cards.slice(-last).map((cardRef, i) => (
						<li
							className="pointer-events-auto col-end-1 row-end-1"
							key={cardRef.key}
							style={getVariantStyle[variant](i)}
						>
							<Card size={size} card={cardRef} />
						</li>
					))
				}
			</ol>
			{cards.length > 1 && (
				<Badge
					variant="default"
					colorScheme="outline"
					aria-label="Cards in pile"
					className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-3/4 select-none gap-1 pl-1 pr-2"
				>
					<IconCards size={8} />
					{cards.length}
				</Badge>
			)}
		</div>
	);
};
