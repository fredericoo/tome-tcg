import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';

import { DbCard } from '../../../tome-api/src/features/engine/engine.game';
import { DistributiveOmit } from '../../../tome-api/src/lib/type-utils';
import { useCardHighlight } from '../routes/games.$id';

export const cardClass = cva({
	base: 'aspect-[63/88] rounded-lg select-none transition-shadow',
	variants: {
		variant: {
			placeholder: '',
			card: 'outline outline-neutral-200/20 p-2',
		},
		face: {
			back: 'bg-gradient-to-tr from-teal-900 to-teal-800',
			front: 'bg-gradient-to-tr',
		},
		size: {
			md: 'h-[22.5vh]',
			sm: 'h-[15vh]',
		},
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/20 cursor-pointer',
		},
		highlight: {
			effect: 'shadow-[0_0_32px_rgba(0,255,255)] z-20',
			negative: 'shadow-[0_0_32px_rgba(255,0,0)] z-20',
			positive: 'shadow-[0_0_32px_rgba(0,255,0)] z-20',
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
	base: 'bg-white h-full overflow-hidden rounded-sm p-2 space-y-2',
});

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
	const flipped = !!data;
	const pubsubHighlight = useCardHighlight(layoutId);
	const highlight = highlightOverride || pubsubHighlight;
	const key = layoutId.toString();

	if (!flipped)
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
		<motion.div
			key={key}
			layoutId={key}
			layout="preserve-aspect"
			className={cardClass({
				face: 'front',
				size,
				className,
				interactive,
				highlight,
				color1: color1 ?? 'neutral',
				color2: color2 ?? color1 ?? 'neutral',
			})}
			animate={{ rotate: 0 }}
			{...props}
		>
			<div className={cardBodyClass()}>
				<p className="text-sm font-bold leading-none tracking-tight">{data?.name}</p>
				<p className="text-xs leading-tight text-neutral-600">{data?.description}</p>
			</div>
		</motion.div>
	);
};
