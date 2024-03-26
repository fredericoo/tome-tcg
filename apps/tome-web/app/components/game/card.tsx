import { clsx } from 'clsx';
import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';
import { create } from 'zustand';

import type { PubSubCard, PubSubShownCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { useCardData } from '../../lib/card-data';
import { useHighlightedCardsStore } from '../../routes/games.$id';

export const isShownCard = (card: PubSubCard): card is PubSubShownCard => 'id' in card;

export const cardClass = cva({
	base: 'aspect-[63/88] rounded-lg select-none transition-shadow',
	variants: {
		variant: {
			placeholder: '',
			card: 'outline outline-neutral-200/20 p-1.5',
		},
		face: {
			back: 'bg-gradient-to-tr from-teal-900 to-teal-800',
			front: 'bg-gradient-to-tr overflow-hidden',
		},
		size: {
			md: 'h-[22.5vh]',
			sm: 'h-[15vh]',
		},
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/20 cursor-pointer',
		},
		highlight: {
			effect: 'animate-card-effect',
			negative: 'shadow-[0_0_32px_rgba(255,0,0)] z-20 bg-red-500',
			positive: 'shadow-[0_0_32px_rgba(0,255,0)] z-20 bg-green-500',
		},
		color1: {
			red: 'from-red-800',
			green: 'from-green-800',
			blue: 'from-blue-800',
			neutral: 'from-neutral-800',
		},
		color2: {
			red: 'to-red-700',
			green: 'to-green-700',
			blue: 'to-blue-700',
			neutral: 'to-neutral-700',
		},
	},
	defaultVariants: {
		size: 'sm',
		variant: 'card',
	},
});

type Variants = VariantProps<typeof cardClass>;

const cardBodyClass = cva({
	base: 'h-full overflow-hidden rounded-sm',
	variants: {
		type: {
			spell: 'bg-white',
			field: 'text-white',
		},
	},
});

type HoveredCardStore = {
	hoveredCard: number | null;
	setHoveredCard: (cardKey: number | null) => void;
};
const useHoveredCard = create<HoveredCardStore>(set => ({
	hoveredCard: null,
	setHoveredCard: cardKey => set({ hoveredCard: cardKey }),
}));

export interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, keyof MotionProps> {
	card: PubSubCard;
	size: Variants['size'];
	interactive?: boolean;
	highlight?: Variants['highlight'];
}

export const Card = ({ card, className, size, interactive, highlight: highlightOverride, ...props }: CardProps) => {
	const cardData = useCardData();
	const data = isShownCard(card) ? cardData[card.id] : undefined;
	const isHovered = useHoveredCard(s => s.hoveredCard === card.key);
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const pubsubHighlight = useHighlightedCardsStore(s => s.highlightedCards[card.key]);
	const highlight = highlightOverride || pubsubHighlight;

	if (!data)
		return (
			<motion.div
				layoutId={card.key.toString()}
				key={card.key}
				layout="preserve-aspect"
				className={cardClass({ face: 'back', size, className, interactive, highlight })}
				{...props}
			></motion.div>
		);

	const [color1, color2] = (() => {
		if (data.type === 'field') return [data.color, data.color];
		return [data.colors[0], data.colors[1] ?? data.colors[0]];
	})();

	return (
		<div
			className={clsx('relative', { 'z-50': isHovered })}
			onMouseEnter={() => setHovered(card.key)}
			onMouseLeave={() => setHovered(null)}
		>
			{isHovered && (
				<div
					className={cardClass({
						face: 'front',
						size: 'md',
						interactive,
						highlight,
						color1: color1 ?? 'neutral',
						color2: color2 ?? color1 ?? 'neutral',
						className: 'animate-card-preview pointer-events-none absolute -left-1/4 -top-2 shadow-xl',
					})}
				>
					<div className={cardBodyClass({ type: data.type })}>
						<div className="h-full w-full space-y-2 overflow-hidden">
							<p className="p-2 text-center text-sm font-bold leading-none tracking-tight">{data.name}</p>
							<p className="overflow-hidden px-2 text-left text-xs leading-tight opacity-60">{data.description}</p>
						</div>
					</div>
					<CardAttack card={card} />
					<CardHeal card={card} />
				</div>
			)}
			<motion.div
				key={card.key}
				layoutId={card.key.toString()}
				layout="preserve-aspect"
				className={cardClass({
					face: 'front',
					size,
					className: clsx(className, 'relative'),
					interactive,
					highlight,
					color1: color1 ?? 'neutral',
					color2: color2 ?? color1 ?? 'neutral',
				})}
				animate={{ rotate: 0 }}
				{...props}
			>
				<div className={cardBodyClass({ type: data.type })}>
					<div className="h-full w-full space-y-2 overflow-hidden">
						<p className="p-2 text-center text-sm font-bold leading-none tracking-tight">{data.name}</p>
						{size === 'md' && (
							<p className="overflow-hidden px-1 text-left text-xs leading-tight opacity-60">{data.description}</p>
						)}
					</div>
				</div>
				<CardAttack card={card} />
				<CardHeal card={card} />
			</motion.div>
		</div>
	);
};

const CardAttack = ({ card }: { card: PubSubCard }) => {
	if (!isShownCard(card)) return null;
	if (card.type === 'field') return null;

	return (
		<div className="absolute bottom-1 right-1 rounded-full bg-white px-2 py-1 text-xs ring-2 ring-neutral-900/20">
			{card.attack}
		</div>
	);
};

const CardHeal = ({ card }: { card: PubSubCard }) => {
	if (!isShownCard(card)) return null;
	if (card.type === 'field') return null;
	if (card.heal === undefined) return null;

	return (
		<div className="absolute bottom-1 left-1 rounded-full bg-white px-2 py-1 text-xs text-green-500 ring-2 ring-green-600/80">
			+{card.heal} HP
		</div>
	);
};
