import { IconMinus, IconPlus } from '@tabler/icons-react';
import clsx from 'clsx';

import { CardSlug } from '../../../../tome-api/src/features/card/card.db';
import { Button } from '../button';
import { Card } from '../game/card';
import { useCardBuilderStore } from './card-builder-store';

export const CardWithAction = ({ id }: { id: CardSlug }) => {
	const qty = useCardBuilderStore(state => state.cards[id] ?? 0);
	const addCard = useCardBuilderStore(state => state.addCard);
	const removeCard = useCardBuilderStore(state => state.removeCard);

	return (
		<>
			<button
				className={clsx('fr ease-expo-out w-full transition-opacity duration-300', { 'opacity-50': qty >= 2 })}
				onClick={() => addCard(id)}
				disabled={qty >= 2}
			>
				<Card className="w-full" size="lg" pubsubCard={{ id, key: 0 }} face="front" />
			</button>
			<div className="flex items-center gap-2">
				<Button disabled={qty >= 2} onClick={() => addCard(id)} variant="ghost" size="icon">
					<IconPlus />
				</Button>

				<span>{qty}</span>

				<Button disabled={qty === 0} onClick={() => removeCard(id)} variant="ghost" size="icon">
					<IconMinus />
				</Button>
			</div>
		</>
	);
};
