import { ComponentPropsWithoutRef } from 'react';

import { PubSubCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { Card, CardProps, cardClass } from './card';

interface CardPileProps extends ComponentPropsWithoutRef<'div'> {
	cards: PubSubCard[];
	last: number;
	size: CardProps['size'];
}

export const CardPile = ({ cards, last = 5, size = 'md' }: CardPileProps) => {
	return (
		<div className="relative">
			<ol className={cardClass({ size, variant: 'placeholder', className: 'grid' })}>
				{
					// we only add the last N cards onto the dom to avoid excessive dom nodes
					cards.slice(-last).map(cardRef => (
						<li className="col-end-1 row-end-1" key={cardRef.key}>
							<Card size={size} card={cardRef} />
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
