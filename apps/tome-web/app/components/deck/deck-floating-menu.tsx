import { IconCards, IconChevronCompactDown } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';

import { useCardData } from '../../lib/card-data';
import { cardsMapToArray, useCardBuilderStore } from './card-builder-store';
import { CurrentDeck } from './current-deck';
import { DeckColorCounts } from './deck-color-counts';

export const DeckFloatingMenu = () => {
	const [state, setState] = useState<'open' | 'closed'>('open');
	const cardData = useCardData();
	const cards = useCardBuilderStore(state => state.cards);
	const cardsList = cardsMapToArray(cards);

	return (
		<footer
			className={clsx('sticky bottom-0 p-2 transition-transform duration-500', {
				'translate-y-full': cardsList.length === 0,
			})}
		>
			<div
				className={clsx(
					'bg-neutral-12 ring-neutral-11/10 rounded-4 ease-expo-out mx-auto flex max-w-screen-md flex-col shadow-lg ring-2 ',
				)}
			>
				<button
					onClick={() => setState(s => (s === 'closed' ? 'open' : 'closed'))}
					className="fr rounded-t-4 flex items-center gap-2 px-2 py-3"
				>
					<div className="text-neutral-4 flex flex-1 items-center px-2">
						<div className="flex items-center gap-1">
							<IconCards />
							<p>
								<span className={clsx('label-md', { 'text-negative-9': cardsList.length > 30 })}>
									{cardsList.length}
								</span>
								<span className="label-xs opacity-50">/30</span>
							</p>
						</div>
					</div>

					<div className="text-neutral-1">
						{state === 'open' ?
							<IconChevronCompactDown />
						:	<span>View deck</span>}
					</div>

					<div className="flex flex-1 justify-end px-2">
						<DeckColorCounts className="text-neutral-1" cardData={cardData} cardsList={cardsList} />
					</div>
				</button>

				<div className={clsx('[content:paint]', { hidden: state !== 'open' })}>
					<CurrentDeck />
				</div>
			</div>
		</footer>
	);
};
