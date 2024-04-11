import { Slot } from '@radix-ui/react-slot';
import * as Tooltip from '@radix-ui/react-tooltip';
import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';
import { create } from 'zustand';

import type { SpellColor } from '../../../../tome-api/src/features/engine/engine.game';
import type { PubSubCard, PubSubShownCard } from '../../../../tome-api/src/features/game/game.pubsub';
import { exhaustive, invariant } from '../../../../tome-api/src/lib/utils';
import { CardData, useCardData } from '../../lib/card-data';
import { Image } from '../image';
import { getVfxId } from './vfx-canvas';

export const isShownCard = (card: PubSubCard): card is PubSubShownCard => 'id' in card;

const CARD_RATIO = 63 / 88;

const sizeToRenderedWidth = {
	sm: CARD_RATIO * 12 + 'vh',
	md: CARD_RATIO * 15 + 'vh',
	lg: CARD_RATIO * 33 + 'vh',
};

export const cardSizeToClass = {
	sm: 'h-[12vh] aspect-[63/88]',
	md: 'h-[15vh] aspect-[63/88]',
	lg: 'h-[33vh] aspect-[63/88]',
};

export const cardClass = cva({
	base: 'select-none relative [-webkit-user-drag:none] ease-expo-out transition-transform duration-500 rounded-[1vh] ring-1 ring-[#4F3739]/20 [transform-style:preserve-3d]',
	variants: {
		size: cardSizeToClass,
		face: {
			front: '',
			back: '[transform:rotateY(180deg)]',
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
export const useHoveredCard = create<HoveredCardStore>(set => ({
	hoveredCard: null,
	setHoveredCard: cardKey => set({ hoveredCard: cardKey }),
}));

export interface GameCardProps
	extends Omit<ComponentPropsWithoutRef<'div'>, keyof MotionProps | 'id' | 'onMouseEnter' | 'onMouseLeave'> {
	info: PubSubCard;
	size: Variants['size'];
}

/** in-game implementation of Card with hover events etc. */
export const GameCard = ({ info, size, className, ...props }: GameCardProps) => {
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const face = isShownCard(info) ? 'front' : 'back';

	return (
		<Tooltip.Root open={face === 'back' ? false : undefined}>
			<Tooltip.Trigger asChild>
				<motion.div
					id={getVfxId({ type: 'card', cardKey: info.key })}
					layoutId={info.key.toString()}
					initial={false}
					layout="preserve-aspect"
					onMouseEnter={() => setHovered(info.key)}
					onMouseLeave={() => setHovered(null)}
					{...props}
				>
					<Card face={face} pubsubCard={info} size={size} className={className} />
				</motion.div>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content sideOffset={5} sticky="always" collisionPadding={16} side="top" style={{ zIndex: 60 }}>
					<Card face="front" pubsubCard={info} size="lg" className={className} />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};

export type CardProps = {
	size: Variants['size'];
	pubsubCard: PubSubCard;
	asChild?: boolean;
	face: 'front' | 'back';
	className?: string;
};

export const Card = ({ size = 'sm', asChild, face, pubsubCard, className, ...props }: CardProps) => {
	const Component = asChild ? Slot : 'div';

	return (
		<Component className={cardClass({ size, face, className })} {...props}>
			<div
				data-side="front"
				className="absolute inset-0 h-full w-full rounded-[1vh] bg-[#F6EFE8] p-[0.5vh] text-[#4F3739] [backface-visibility:hidden]"
			>
				{isShownCard(pubsubCard) ?
					<CardFront pubsubCard={pubsubCard} size={size} />
				:	null}
			</div>
			<CardBack size={size} />
		</Component>
	);
};

interface CardBackProps extends ComponentPropsWithoutRef<'img'> {
	size: NonNullable<Variants['size']>;
}

export const CardBack = ({ size, ...props }: CardBackProps) => {
	return (
		<Image
			srcWidth={sizeToRenderedWidth[size]}
			className="absolute inset-0 aspect-[63/88] h-full w-full overflow-hidden rounded-[1vh] [backface-visibility:hidden] [transform:rotateY(180deg)]"
			src="/card-back.png"
			alt="Card"
			{...props}
		/>
	);
};

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

interface CardFrontProps {
	pubsubCard: PubSubShownCard;
	size: NonNullable<Variants['size']>;
}
export const CardFront = ({ pubsubCard, size }: CardFrontProps) => {
	const cardData = useCardData();
	const data = cardData[pubsubCard.id];
	invariant(data, `Card data not found for card ID ${pubsubCard.id}`);
	const colors = data.type === 'field' ? [data.color].filter(Boolean) : data.colors;

	return (
		<>
			<div className="absolute left-[0.5vh] right-[1vh] top-0 flex justify-end gap-1">
				{colors.map(color => (
					<CardColor key={color} color={color} />
				))}
			</div>
			<CardImage slug={pubsubCard.id} size={size} />
			<CardBody data={data} size={size} />
			<CardFooter data={data} card={pubsubCard} />
		</>
	);
};

export const getCardImageSrc = (image: string) => `/cards/${image}.png`;

const CardImage = ({ size, slug }: { slug: string; size: NonNullable<Variants['size']> }) => {
	switch (size) {
		case 'lg':
		case 'md':
			return (
				<div className="aspect-[696/644] w-full rounded-[0.5vh] bg-[#B8A1A3] shadow-md">
					<Image
						srcWidth={sizeToRenderedWidth[size]}
						src={getCardImageSrc(slug)}
						alt=""
						className="h-full w-full overflow-hidden rounded-[0.5vh] object-cover"
					/>
				</div>
			);
		case 'sm':
			return (
				<div className="h-full w-full rounded-[0.5vh] bg-[#B8A1A3] shadow-md">
					<Image
						srcWidth={sizeToRenderedWidth[size]}
						src={`/cards/${slug}.png`}
						alt=""
						className="h-full w-full overflow-hidden rounded-[0.5vh] object-cover"
					/>
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
							<p className="overflow-hidden px-1 text-left text-xs leading-tight opacity-80">{data.description}</p>
						</>
					)}
				</div>
			);
		default:
			throw exhaustive(size);
	}
};

const CardFooter = ({ card, data }: { card: PubSubCard; data: CardData[keyof CardData] }) => {
	if (data.type !== 'spell') return null;

	const healValue =
		isShownCard(card) && card.type === 'spell' ? card.heal
		: 'heal' in data ?
			typeof data.heal === 'object' ?
				data.heal.label
			:	data.heal
		:	null;
	const attackValue =
		isShownCard(card) && card.type === 'spell' ? card.attack
		: 'attack' in data ?
			typeof data.attack === 'object' ?
				data.attack.label
			:	data.attack
		:	null;

	return (
		<footer className="absolute bottom-[0.5vh] left-[0.5vh] right-[0.5vh] flex items-center justify-end gap-1">
			{healValue ?
				<div className="rounded-full bg-[#C0D8AE] px-2 py-0.5 text-xs text-[#414C38]">{healValue}</div>
			:	null}
			{attackValue ?
				<div className="rounded-full bg-[#4F3739] px-2 py-0.5 text-xs text-white">{attackValue}</div>
			:	null}
		</footer>
	);
};
