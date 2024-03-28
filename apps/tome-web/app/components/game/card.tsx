import { clsx } from 'clsx';
import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';
import { create } from 'zustand';

import { SpellColor } from '../../../../tome-api/src/features/engine/engine.game';
import type {
	PubSubCard,
	PubSubShownCard,
	PubSubShownSpellCard,
} from '../../../../tome-api/src/features/game/game.pubsub';
import { exhaustive, invariant } from '../../../../tome-api/src/lib/utils';
import cardBackSrc from '../../../public/card-back.png';
import { CardData, useCardData } from '../../lib/card-data';
import { useHighlightedCardsStore } from '../../routes/games.$id';

export const isShownCard = (card: PubSubCard): card is PubSubShownCard => 'id' in card;

export const cardClass = cva({
	base: 'select-none transition-shadow overflow-hidden rounded-[1vmin] ring-1 ring-[#4F3739]/20',
	variants: {
		size: {
			md: 'h-[33vmin] aspect-[63/88]',
			sm: 'h-[15vmin] aspect-[63/88]',
		},
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/80 cursor-pointer',
		},
		highlight: {
			effect: 'animate-card-effect',
			negative: 'shadow-[0_0_32px_rgba(255,0,0)] z-20 bg-red-500',
			positive: 'shadow-[0_0_32px_rgba(0,255,0)] z-20 bg-green-500',
		},
	},
	defaultVariants: {
		size: 'sm',
	},
});

type Variants = VariantProps<typeof cardClass>;

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

export const Card = ({
	card,
	className,
	size = 'sm',
	interactive,
	highlight: highlightOverride,
	...props
}: CardProps) => {
	const isHovered = useHoveredCard(s => s.hoveredCard === card.key);
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const pubsubHighlight = useHighlightedCardsStore(s => s.highlightedCards[card.key]);
	const highlight = highlightOverride || pubsubHighlight;

	return (
		<motion.div
			layoutId={card.key.toString()}
			key={card.key}
			layout="preserve-aspect"
			className={cardClass({ size, className, interactive, highlight })}
			{...props}
		>
			{isShownCard(card) && isHovered && (
				<div
					className={cardClass({
						size: 'md',
						className: 'animate-card-preview pointer-events-none absolute -left-1/4 -top-2 z-50 shadow-xl',
					})}
				>
					<CardFront card={card} size="md" />
				</div>
			)}

			{isShownCard(card) ?
				<CardFront
					card={card}
					size={size}
					className={clsx('relative', { 'z-50': isHovered })}
					onMouseEnter={() => setHovered(card.key)}
					onMouseLeave={() => setHovered(null)}
				/>
			:	<CardBack />}
		</motion.div>
	);
};

export const CardBack = () => {
	return <img className="h-full w-full" src={cardBackSrc} alt="Card" />;
};

const cardFrontClass = cva({
	base: 'p-[0.5vmin] w-full h-full bg-[#F6EFE8] text-[#4F3739]',
	variants: {
		type: {
			spell: '',
			field: '',
		},
	},
});

const cardColorClass = cva({
	base: 'w-6 aspect-[1/1.75]',
	variants: {
		color: {
			red: 'text-[#FE4D00]',
			green: 'text-[#A1BE3F]',
			blue: 'text-[#5F6DEE]',
		},
	},
});
const CardColor = ({ color }: { color: SpellColor }) => {
	return (
		<svg className={cardColorClass({ color })}>
			<use xlinkHref={`#bookmark-${color}`} />
		</svg>
	);
};

interface CardFrontProps extends ComponentPropsWithoutRef<'div'> {
	card: PubSubShownCard;
	size: NonNullable<Variants['size']>;
}
const CardFront = ({ card, size, className, ...props }: CardFrontProps) => {
	const cardData = useCardData();
	const data = cardData[card.id];
	invariant(data, `Card data not found for card ID ${card.id}`);
	const colors = data.type === 'field' ? [data.color].filter(Boolean) : data.colors;

	return (
		<div className={cardFrontClass({ type: data.type, className })} {...props}>
			<div className="absolute left-[0.5vmin] right-[1vmin] top-0 flex justify-end gap-1">
				{colors.map(color => (
					<CardColor key={color} color={color} />
				))}
			</div>
			<div className="aspect-[696/644] w-full rounded-[0.5vmin] bg-[#B8A1A3] shadow-md">
				{data.image && (
					<img src={`/cards/${data.image}.png`} alt="" className="h-full w-full rounded-[0.5vmin] object-cover" />
				)}
			</div>
			<CardBody data={data} size={size} />
			{card.type === 'spell' && <CardFooter card={card} />}
		</div>
	);
};

const CardBody = ({ data, size }: { data: CardData[keyof CardData]; size: NonNullable<Variants['size']> }) => {
	switch (size) {
		case 'sm':
			return (
				<div className="p-[0.5vmin]">
					<p className="line-clamp-2 text-center text-xs font-bold leading-none">{data.name}</p>
				</div>
			);
		case 'md':
			return (
				<div className="p-[0.5vmin]">
					<p className="text-md py-1 text-center font-bold leading-none">{data.name}</p>
					{data.description.length > 0 && (
						<>
							<div className="flex items-center gap-1 text-[#B8A1A3]">
								<div className="h-px flex-1 bg-current" />
								<span className="text-[1vmin] font-bold tracking-widest">EFFECT</span>
								<div className="h-px flex-1 bg-current" />
							</div>
							<p className="overflow-hidden px-1 text-left text-sm leading-tight opacity-80">{data.description}</p>
						</>
					)}
				</div>
			);
		default:
			throw exhaustive(size);
	}
};

const CardFooter = ({ card }: { card: PubSubShownSpellCard }) => {
	return (
		<footer className="absolute bottom-[0.5vmin] left-[0.5vmin] right-[0.5vmin] flex items-center justify-end gap-1">
			{card.heal && <div className="rounded-full bg-[#C0D8AE] px-2 py-0.5 text-xs text-[#414C38]">+{card.heal} HP</div>}
			<div className="rounded-full bg-[#4F3739] px-2 py-0.5 text-xs text-white">{card.attack}</div>
		</footer>
	);
};
