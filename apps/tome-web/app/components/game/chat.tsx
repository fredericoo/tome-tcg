import { useEffect, useRef } from 'react';
import reactStringReplace from 'react-string-replace';

import type { Side } from '../../../../tome-api/src/features/engine/engine.game';
import type { SanitisedLogIteration } from '../../../../tome-api/src/features/engine/engine.log';
import { PubSubCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { useCardData } from '../../lib/card-data';
import { useGameStore } from '../../lib/game.utils';
import { useCardHoverEvents } from '../card-details-overlay';
import { isShownCard } from './card';

const handlebarsRegex = /{{([^{}]+)}}/g;

type ParseableSides = Record<Side, { username: string | null }>;

export const CardPreview = ({ pubsubCard }: { pubsubCard: PubSubCard }) => {
	const cardData = useCardData();
	const handlers = useCardHoverEvents(pubsubCard);
	const card = isShownCard(pubsubCard) ? cardData[pubsubCard.id] : undefined;

	return (
		<span className="relative font-bold" {...handlers}>
			{card?.name ?? 'Unknown card'}
		</span>
	);
};

const ChatMessage = ({ log, sides }: { log: SanitisedLogIteration; sides: ParseableSides }) => {
	if (!log.dynamic) return log.text;

	return reactStringReplace(log.text, handlebarsRegex, match => {
		const value = log.dynamic?.[match];
		if (!value) return match;
		switch (value.type) {
			case 'card': {
				return <CardPreview pubsubCard={value} />;
			}
			case 'player':
				return <span className="font-bold">{sides[value.side].username ?? value.side}</span>;
		}
	});
};

const formatter = new Intl.DateTimeFormat('en', { timeStyle: 'medium' });

export const Chat = ({ sides }: { sides: ParseableSides }) => {
	const chat = useGameStore(s => s.chat);
	const chatRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		if (!chatRef.current) return;
		chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
	}, [chat]);

	return (
		<ul
			ref={chatRef}
			className="bg-neutral-12 hide-scrollbars h-full scroll-my-2 overflow-y-scroll scroll-smooth p-4 text-white"
		>
			{chat.map((message, i) => (
				<li key={`${i}-${message.timestamp}`} className="body-sm flex items-start gap-2 py-0.5">
					<time className="flex-none tabular-nums opacity-30">{formatter.format(message.timestamp)}</time>
					<div>
						<ChatMessage log={message} sides={sides} />
					</div>
				</li>
			))}
		</ul>
	);
};
