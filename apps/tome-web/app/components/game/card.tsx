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
import { CardData, useCardData } from '../../lib/card-data';
import { Image } from '../image';

export const isShownCard = (card: PubSubCard): card is PubSubShownCard => 'id' in card;

const sizeToRenderedWidth = {
	// 0.7159090909 * 12vh
	sm: '8.59vh',
	// 0.7159090909 * 15vh
	md: '10.73vh',
	// 0.7159090909 * 33vh
	lg: '23.62vh',
};
export const cardClass = cva({
	base: 'select-none transition-shadow overflow-hidden rounded-[1vh] ring-1 ring-[#4F3739]/20',
	variants: {
		size: {
			lg: 'h-[33vh] aspect-[63/88]',
			md: 'h-[15vh] aspect-[63/88]',
			sm: 'h-[12vh] aspect-[63/88]',
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
	const highlight = highlightOverride;

	return (
		<motion.div
			layoutId={card.key.toString()}
			key={card.key}
			initial={false}
			animate={{ rotateY: isShownCard(card) ? 0 : 180 }}
			layout="preserve-aspect"
			className={cardClass({ size, className, interactive, highlight })}
			{...props}
		>
			{isShownCard(card) && isHovered && (
				<div
					className={cardClass({
						size: 'lg',
						className: 'animate-card-preview pointer-events-none absolute -top-2 left-1/2 z-50 shadow-xl',
					})}
				>
					<CardFront card={card} size="lg" />
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
			:	<CardBack size={size} />}
		</motion.div>
	);
};

interface CardBackProps extends ComponentPropsWithoutRef<'img'> {
	size: NonNullable<Variants['size']>;
}

export const CardBack = ({ size, ...props }: CardBackProps) => {
	return (
		<Image
			srcWidth={sizeToRenderedWidth[size]}
			className="aspect-[63/88] h-full rounded-[1vh]"
			src="/card-back.png"
			alt="Card"
			{...props}
		/>
	);
};

const cardFrontClass = cva({
	base: 'p-[0.5vh] w-full h-full bg-[#F6EFE8] text-[#4F3739]',
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
			<div className="absolute left-[0.5vh] right-[1vh] top-0 flex justify-end gap-1">
				{colors.map(color => (
					<CardColor key={color} color={color} />
				))}
			</div>
			<CardImage data={data} size={size} />
			<CardBody data={data} size={size} />
			{card.type === 'spell' && <CardFooter card={card} />}
		</div>
	);
};

export const getCardImageSrc = (image: string) => `/cards/${image}.png`;

const CardImage = ({ data, size }: { data: CardData[keyof CardData]; size: NonNullable<Variants['size']> }) => {
	switch (size) {
		case 'lg':
		case 'md':
			return (
				<div className="aspect-[696/644] w-full rounded-[0.5vh] bg-[#B8A1A3] shadow-md">
					{data.image && (
						<Image
							srcWidth={sizeToRenderedWidth[size]}
							src={getCardImageSrc(data.image)}
							alt=""
							className="h-full w-full overflow-hidden rounded-[0.5vh] object-cover"
						/>
					)}
				</div>
			);
		case 'sm':
			return (
				<div className="h-full w-full rounded-[0.5vh] bg-[#B8A1A3] shadow-md">
					{data.image && (
						<Image
							srcWidth={sizeToRenderedWidth[size]}
							src={`/cards/${data.image}.png`}
							alt=""
							className="h-full w-full overflow-hidden rounded-[0.5vh] object-cover"
						/>
					)}
				</div>
			);
		default:
			throw exhaustive(size);
	}
};

const CardBody = ({ data, size }: { data: CardData[keyof CardData]; size: NonNullable<Variants['size']> }) => {
	switch (size) {
		case 'sm':
			return null;
		case 'md':
			return (
				<div className="p-[0.5vh]">
					<p className="line-clamp-2 text-center text-xs font-bold leading-none">{data.name}</p>
				</div>
			);
		case 'lg':
			return (
				<div className="p-[0.5vh]">
					<p className="text-md py-1 text-center font-bold leading-none">{data.name}</p>
					{data.description.length > 0 && (
						<>
							<div className="flex items-center gap-1 text-[#B8A1A3]">
								<div className="h-px flex-1 bg-current" />
								<span className="text-[1vh] font-bold tracking-widest">EFFECT</span>
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
		<footer className="absolute bottom-[0.5vh] left-[0.5vh] right-[0.5vh] flex items-center justify-end gap-1">
			{card.heal && <div className="rounded-full bg-[#C0D8AE] px-2 py-0.5 text-xs text-[#414C38]">{card.heal}</div>}
			<div className="rounded-full bg-[#4F3739] px-2 py-0.5 text-xs text-white">{card.attack}</div>
		</footer>
	);
};
