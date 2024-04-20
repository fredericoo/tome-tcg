import { create } from 'zustand';

import { CardSlug } from '../../../../tome-api/src/features/card/card.db';
import { createZustandContext } from '../../lib/zustand';

export type CardsMap = Partial<Record<CardSlug, number>>;

type CardBuilderStore = {
	/** {card_id: quantity} */
	cards: CardsMap;
	addCard: (id: CardSlug) => void;
	removeCard: (id: CardSlug) => void;
};

export const { Provider: CardBuilderProvider, useContext: useCardBuilderStore } = createZustandContext(
	(initialState: { cards: CardsMap }) =>
		create<CardBuilderStore>(set => ({
			cards: initialState.cards,
			addCard: id =>
				set(state => {
					const qty = state.cards[id];
					if (qty && qty >= 2) return state;
					return { cards: { ...state.cards, [id]: (qty ?? 0) + 1 } };
				}),
			removeCard: id =>
				set(state => {
					const newCards = { ...state.cards };
					if (!newCards[id]) return state;
					if (newCards[id]! > 1) {
						newCards[id]!--;
					} else {
						delete newCards[id];
					}
					return { cards: newCards };
				}),
		})),
);

export const cardsMapToArray = (cards: CardsMap): CardSlug[] => {
	return Object.entries(cards).flatMap(([id, count]) => Array(count).fill(id));
};

export const cardsListToMap = (cards: CardSlug[]): CardsMap => {
	const map: CardsMap = {};
	for (const card of cards) {
		map[card] = (map[card] ?? 0) + 1;
	}
	return map;
};
