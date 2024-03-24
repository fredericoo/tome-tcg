import { clsx } from 'clsx';
import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';
import { create } from 'zustand';

import { DbCard } from '../../../tome-api/src/features/engine/engine.game';
import { DistributiveOmit } from '../../../tome-api/src/lib/type-utils';
import { useHighlightedCardsStore } from '../routes/games.$id';

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
	base: 'bg-white h-full overflow-hidden rounded-sm',
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
	layoutId: number;
	data?: DistributiveOmit<DbCard, 'effects'>;
	size: Variants['size'];
	interactive?: boolean;
	highlight?: Variants['highlight'];
}

export const Card = ({
	layoutId,
	data,
	className,
	size,
	interactive,
	highlight: highlightOverride,
	...props
}: CardProps) => {
	const isHovered = useHoveredCard(s => s.hoveredCard === layoutId);
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const pubsubHighlight = useHighlightedCardsStore(s => s.highlightedCards[layoutId]);
	const highlight = highlightOverride || pubsubHighlight;
	const key = layoutId.toString();

	if (!data)
		return (
			<motion.div
				layoutId={key}
				key={key}
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
		<div className="relative" onMouseEnter={() => setHovered(layoutId)} onMouseLeave={() => setHovered(null)}>
			{isHovered && (
				<div
					className={cardClass({
						face: 'front',
						size: 'md',
						interactive,
						highlight,
						color1: color1 ?? 'neutral',
						color2: color2 ?? color1 ?? 'neutral',
						className: 'animate-card-preview pointer-events-none absolute -left-1/4 -top-2 z-30 shadow-xl',
					})}
				>
					<div className={cardBodyClass()}>
						<div className="h-full w-full space-y-2 overflow-hidden">
							<p className="p-2 text-center text-sm font-bold leading-none tracking-tight">{data.name}</p>
							<p className="overflow-hidden px-2 text-left text-xs leading-tight text-neutral-600">
								{data.description}
							</p>
						</div>
					</div>
					{data.type === 'spell' && (
						<>
							<div className="absolute bottom-1 right-1 rounded-full bg-white px-2 py-1 text-xs ring-2 ring-neutral-900/20">
								{data.attack === 0 ? 'X' : data.attack}
							</div>
							{data.heal ?
								<div className="absolute bottom-1 left-1 rounded-full bg-white px-2 py-1 text-xs text-green-500 ring-2 ring-green-600/80">
									+{data.heal} HP
								</div>
							:	null}
						</>
					)}
				</div>
			)}
			<motion.div
				key={key}
				layoutId={key}
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
				<div className={cardBodyClass()}>
					<div className="h-full w-full space-y-2 overflow-hidden">
						<p className="p-2 text-center text-sm font-bold leading-none tracking-tight">{data.name}</p>
						{size === 'md' && (
							<p className="overflow-hidden px-1 text-left text-xs leading-tight text-neutral-600">
								{data.description}
							</p>
						)}
					</div>
				</div>
				{data.type === 'spell' && (
					<>
						<div className="absolute bottom-1 right-1 rounded-full bg-white px-2 py-1 text-xs ring-2 ring-neutral-900/20">
							{data.attack === 0 ? 'X' : data.attack}
						</div>
						{data.heal ?
							<div className="absolute bottom-1 left-1 rounded-full bg-white px-2 py-1 text-xs text-green-500 ring-2 ring-green-600/80">
								+{data.heal} HP
							</div>
						:	null}
					</>
				)}
			</motion.div>
		</div>
	);
};
