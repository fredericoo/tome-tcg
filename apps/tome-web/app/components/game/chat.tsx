import { useEffect, useRef } from 'react';
import reactStringReplace from 'react-string-replace';

import type { Side } from '../../../../tome-api/src/features/engine/engine.game';
import type { SanitisedLogIteration } from '../../../../tome-api/src/features/engine/engine.log';
import { useCardData } from '../../lib/card-data';
import { useGameStore } from '../../lib/game.utils';

const handlebarsRegex = /{{([^{}]+)}}/g;

type ParseableSides = Record<Side, { username: string | null }>;

export const CardPreview = ({ pubsubCard }: { pubsubCard: { id: string } }) => {
	const cardData = useCardData();
	// const [isHovered, setIsHovered] = useState(false);
	const card = cardData[pubsubCard.id];

	return (
		<span
			className="relative font-bold"
			// onMouseEnter={() => setIsHovered(true)}
			// onMouseLeave={() => setIsHovered(false)}
		>
			{/* {isHovered && card && (
				<div
					className={cardClass({
						size: 'lg',
						className: 'animate-card-preview pointer-events-none absolute -top-2 left-1/2 z-50 shadow-xl',
					})}
				>
					<CardFront card={pubsubCard} size="lg" />
				</div>
			)} */}
			{card?.name ?? 'Unkown card'}
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
