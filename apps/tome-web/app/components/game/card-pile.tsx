import { IconCards } from '@tabler/icons-react';
import { ComponentPropsWithoutRef } from 'react';

import { PubSubCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { Badge } from '../badge';
import { Card, CardProps, cardClass } from './card';

interface CardPileProps extends ComponentPropsWithoutRef<'div'> {
	cards: PubSubCard[];
	last: number;
	size: CardProps['size'];
}

export const CardPile = ({ cards, last = 5, size = 'md' }: CardPileProps) => {
	return (
		<div className="relative">
			<ol className={cardClass({ size, className: 'grid' })}>
				{
					// we only add the last N cards onto the dom to avoid excessive dom nodes
					cards.slice(-last).map(cardRef => (
						<li className="col-end-1 row-end-1" key={cardRef.key}>
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
					className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 gap-1 pl-1 pr-2"
				>
					<IconCards size={8} />
					{cards.length}
				</Badge>
			)}
		</div>
	);
};
