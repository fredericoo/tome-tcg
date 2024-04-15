import * as RadioGroup from '@radix-ui/react-radio-group';
import clsx from 'clsx';
import { LayoutGroup, motion } from 'framer-motion';
import { useId } from 'react';

export interface ContentSwitcherProps
	extends Omit<RadioGroup.RadioGroupProps, 'asChild' | 'dir' | 'orientation' | 'loop'> {}

const Container = ({ children, className, ...props }: ContentSwitcherProps) => {
	const id = useId();

	return (
		<LayoutGroup id={id}>
			<RadioGroup.Root
				orientation="horizontal"
				className={clsx(
					'bg-neutral-11/5 hide-scrollbars flex overflow-x-scroll rounded-full p-0.5 shadow-inner',
					className,
				)}
				{...props}
			>
				{children}
			</RadioGroup.Root>
		</LayoutGroup>
	);
};

export interface ContentSwitcherItemProps extends Omit<RadioGroup.RadioGroupItemProps, 'asChild'> {
	tag?: keyof JSX.IntrinsicElements;
}

const Indicator = motion(RadioGroup.Indicator);

const Item = ({ children, tag, ...props }: ContentSwitcherItemProps) => {
	const Tag = tag ? tag : 'label';

	return (
		<RadioGroup.Item
			className="ease-expo-out body-sm data-[state=unchecked]:text-neutral-10 data-[state=checked]:text-neutral-12 relative flex-grow rounded-full px-4 py-1 text-center transition-all duration-200"
			asChild
			{...props}
		>
			<Tag>
				<Indicator
					transition={{ type: 'spring', stiffness: 400, damping: 45 }}
					aria-hidden
					layoutId="indicator"
					className="bg-lowest shadow-surface-sm surface-neutral absolute inset-0 z-0 rounded-full"
				/>
				<div className={clsx('ease-expo-out relative z-10 truncate transition-colors duration-1000')}>{children}</div>
			</Tag>
		</RadioGroup.Item>
	);
};

export const ContentSwitcher = { Container, Item };
