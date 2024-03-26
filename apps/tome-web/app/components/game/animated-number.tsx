import { MotionProps, motion, useSpring, useTransform, useVelocity } from 'framer-motion';
import { ComponentPropsWithoutRef, useEffect } from 'react';

interface AnimatedNumberProps extends Omit<ComponentPropsWithoutRef<'span'>, keyof MotionProps> {
	children: number;
}
export function AnimatedNumber({ children, ...props }: AnimatedNumberProps) {
	const spring = useSpring(children, { mass: 0.8, stiffness: 75, damping: 15 });
	const display = useTransform(spring, current => Math.round(current));
	const velocity = useVelocity(display);
	const color = useTransform(velocity, [-100, 0, 100], ['#f00', '#000', '#0f0']);

	useEffect(() => {
		spring.set(children);
	}, [spring, children]);

	return (
		<motion.span {...props} style={{ color }}>
			{display}
		</motion.span>
	);
}
