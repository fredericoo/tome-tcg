import { cva } from 'cva';
import { MotionProps, motion } from 'framer-motion';
import { ComponentPropsWithoutRef } from 'react';

import { DbCard } from '../../../tome-api/src/features/engine/engine.game';

const cardClass = cva({
	base: 'aspect-[63/88] w-[200px] rounded-lg p-4 outline outline-neutral-200/20',
	variants: {
		face: {
			back: 'bg-gradient-to-tr from-teal-900 to-teal-800',
			front: 'bg-white',
		},
	},
});

interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, keyof MotionProps> {
	layoutId: number;
	data?: Pick<DbCard, 'name' | 'type' | 'description'>;
}

export const Card = ({ layoutId, data, className, ...props }: CardProps) => {
	if (!data)
		return (
			<motion.div
				layoutId={layoutId.toString()}
				layout="preserve-aspect"
				className={cardClass({ face: 'back', className })}
				style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'visible' }}
				{...props}
			></motion.div>
		);

	return (
		<motion.div
			layoutId={layoutId.toString()}
			layout="preserve-aspect"
			className={cardClass({ face: 'front', className })}
			style={{ transform: 'rotateY(0deg)' }}
			{...props}
		>
			<p>{data?.name}</p>
			<p className="text-sm text-neutral-600">{data?.description}</p>
		</motion.div>
	);
};
