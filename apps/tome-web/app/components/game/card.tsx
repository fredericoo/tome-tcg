import clsx from 'clsx';
import { cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
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
	sm: CARD_RATIO * 12 + 'cqh',
	md: CARD_RATIO * 15 + 'cqh',
	lg: CARD_RATIO * 33 + 'cqh',
};

type CardSize = 'sm' | 'md' | 'lg';

export const cardSizeToClass = {
	sm: 'h-[12cqh]',
	md: 'h-[15cqh]',
	lg: 'h-[33cqh]',
};

export const cardClass = cva({
	base: '@container select-none aspect-[63/88] relative [-webkit-user-drag:none] ease-expo-out transition-transform duration-500 rounded-[1cqh] ring-1 ring-[#4F3739]/20 [transform-style:preserve-3d]',
	variants: {
		face: {
			front: '',
			back: '[transform:rotateY(180deg)]',
		},
	},
});

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
	size: CardSize;
}

/** in-game implementation of Card with hover events etc. */
export const GameCard = ({ info, size, className, ...props }: GameCardProps) => {
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const face = isShownCard(info) ? 'front' : 'back';

	return (
		<motion.div
			id={getVfxId({ type: 'card', cardKey: info.key })}
			layoutId={info.key.toString()}
			initial={false}
			layout="preserve-aspect"
			onMouseEnter={() => setHovered(info.key)}
			onMouseLeave={() => setHovered(null)}
			{...props}
		>
			<Card face={face} pubsubCard={info} size={size} className={clsx(className, cardSizeToClass[size])} />
		</motion.div>
	);
};

export type CardProps = {
	size: CardSize;
	pubsubCard: PubSubCard;
	asChild?: boolean;
	face: 'front' | 'back';
	className?: string;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
	({ size = 'sm', face, pubsubCard, className, ...props }, ref) => {
		return (
			<div ref={ref} className={cardClass({ face, className })} {...props}>
				<div
					data-side="front"
					className="absolute inset-0 flex h-full w-full flex-col rounded-[1cqh] bg-[#F6EFE8] text-[#4F3739] [backface-visibility:hidden]"
				>
					{isShownCard(pubsubCard) ?
						<CardFront pubsubCard={pubsubCard} size={size} />
					:	null}
				</div>
				<CardBack size={size} />
			</div>
		);
	},
);

Card.displayName = 'Card';

interface CardBackProps extends ComponentPropsWithoutRef<'img'> {
	size: NonNullable<CardSize>;
}

export const CardBack = ({ size, ...props }: CardBackProps) => {
	return (
		<Image
			srcWidth={sizeToRenderedWidth[size]}
			className="absolute inset-0 aspect-[63/88] h-full w-full overflow-hidden rounded-[1cqh] [backface-visibility:hidden] [transform:rotateY(180deg)]"
			src="/card-back.png"
			alt="Card"
			{...props}
		/>
	);
};

export const cardColorClass = cva({
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
		<svg className={cardColorClass({ color, className: 'aspect-[1/1.75] w-[12.5%]' })}>
			<use xlinkHref={`#bookmark-${color}`} />
		</svg>
	);
};

interface CardFrontProps {
	pubsubCard: PubSubShownCard;
	size: NonNullable<CardSize>;
}
export const CardFront = ({ pubsubCard, size }: CardFrontProps) => {
	const cardData = useCardData();
	const data = cardData[pubsubCard.id];
	invariant(data, `Card data not found for card ID ${pubsubCard.id}`);
	const colors = data.type === 'field' ? [data.color].filter(Boolean) : data.colors;

	return (
		<>
			<div className="absolute left-[0.5cqh] right-[1cqh] top-0 flex justify-end gap-[0.5cqh]">
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

const CardImage = ({ size, slug }: { slug: string; size: NonNullable<CardSize> }) => {
	switch (size) {
		case 'lg':
		case 'md':
			return (
				<div className="w-full px-[0.5cqh] pt-[0.5cqh]">
					<div className="aspect-[696/644] w-full flex-none rounded-[0.5cqh] bg-[#B8A1A3] shadow-md">
						<Image
							srcWidth={sizeToRenderedWidth[size]}
							src={getCardImageSrc(slug)}
							alt=""
							className="h-full w-full overflow-hidden rounded-[0.5cqh] object-cover"
						/>
					</div>
				</div>
			);
		case 'sm':
			return (
				<div className="h-full w-full p-[0.5cqh]">
					<div className="h-full w-full flex-none rounded-[0.5cqh] bg-[#B8A1A3] shadow-md">
						<Image
							srcWidth={sizeToRenderedWidth[size]}
							src={`/cards/${slug}.png`}
							alt=""
							className="h-full w-full overflow-hidden rounded-[0.5cqh] object-cover"
						/>
					</div>
				</div>
			);
		default:
			throw exhaustive(size);
	}
};

const CardBody = ({ data, size }: { data: CardData[keyof CardData]; size: NonNullable<CardSize> }) => {
	switch (size) {
		case 'sm':
			return null;
		case 'md':
			return (
				<div className="p-[0.5cqh]">
					<p className="line-clamp-2 text-center text-xs font-bold leading-none">{data.name}</p>
				</div>
			);
		case 'lg':
			return (
				<div className="hide-scrollbars shrink overflow-auto px-[0.5cqh]">
					<p className="label-sm py-1 text-center">{data.name}</p>
					{data.description.length > 0 && (
						<>
							<div className="flex items-center gap-1 text-[#B8A1A3]">
								<div className="h-px flex-1 bg-current" />
								<span className="text-[1cqh] font-bold tracking-widest">EFFECT</span>
								<div className="h-px flex-1 bg-current" />
							</div>
							<p className="overflow-auto px-1 pb-[1cqh] text-left text-xs leading-tight opacity-80">
								{data.description}
							</p>
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
		<footer className="absolute bottom-[0.5cqh] left-[0.5cqh] right-[0.5cqh] flex items-center justify-end gap-1">
			{healValue ?
				<div className="rounded-full bg-[#C0D8AE] px-2 py-0.5 text-xs text-[#414C38]">{healValue}</div>
			:	null}
			{attackValue ?
				<div className="rounded-full bg-[#4F3739] px-2 py-0.5 text-xs text-white">{attackValue}</div>
			:	null}
		</footer>
	);
};
