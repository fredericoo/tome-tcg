import { VariantProps, cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';

import { DbCard } from '../../../tome-api/src/features/engine/engine.game';
import { useCardHighlight } from '../routes/games.$id';

export const cardClass = cva({
	base: 'aspect-[63/88] rounded-lg select-none',
	variants: {
		variant: {
			placeholder: '',
			card: 'outline outline-neutral-200/20 p-4',
		},
		face: {
			back: 'bg-gradient-to-tr from-teal-900 to-teal-800',
			front: 'bg-white',
		},
		size: {
			md: 'h-[22.5vh]',
			sm: 'h-[15vh]',
		},
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/20 cursor-pointer transition-shadow',
		},
		highlight: {
			effect: 'shadow-md, shadow-amber-500',
			negative: 'shadow-md, shadow-red-500',
			positive: 'shadow-md, shadow-teal-500',
		},
	},
	defaultVariants: {
		size: 'sm',
		variant: 'card',
	},
});

type Variants = VariantProps<typeof cardClass>;

export interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, keyof MotionProps> {
	layoutId: number;
	data?: Pick<DbCard, 'name' | 'type' | 'description'>;
	size: Variants['size'];
	interactive?: boolean;
}

export const Card = ({ layoutId, data, className, size, interactive, ...props }: CardProps) => {
	const flipped = !!data;
	const highlight = useCardHighlight(layoutId);

	if (!flipped)
		return (
			<motion.div
				layoutId={layoutId.toString()}
				layout="preserve-aspect"
				className={cardClass({ face: 'back', size, className, interactive, highlight })}
				initial={false}
				animate={{ rotateY: 180 }}
				{...props}
			></motion.div>
		);

	return (
		<motion.div
			layoutId={layoutId.toString()}
			layout="preserve-aspect"
			className={cardClass({ face: 'front', size, className, interactive, highlight })}
			animate={{ rotate: 0 }}
			{...props}
		>
			<p>{data?.name}</p>
			<p className="text-sm text-neutral-600">{data?.description}</p>
		</motion.div>
	);
};
