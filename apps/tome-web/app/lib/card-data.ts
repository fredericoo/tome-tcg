import { createContext, useContext } from 'react';

import { DbCard } from '../../../tome-api/src/features/engine/engine.game';
import { DistributiveOmit } from '../../../tome-api/src/lib/type-utils';

export type CardData = Record<string, DistributiveOmit<DbCard, 'effects'>>;

const CardDataContext = createContext<CardData | null>(null);

export const CardDataProvider = CardDataContext.Provider;
export const useCardData = () => {
	const cardData = useContext(CardDataContext);
	if (!cardData) throw new Error('useCardData must be used within a CardDataProvider');
	return cardData;
};
