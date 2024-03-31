import { Icon } from '@tabler/icons-react';
import clsx from 'clsx';
import { cva } from 'cva';
import React, { forwardRef } from 'react';

interface TabbarContainerProps extends React.ComponentPropsWithoutRef<'nav'> {}

const Container: React.FC<TabbarContainerProps> = ({ className, ...props }) => {
	return (
		<nav
			className={clsx(
				'rounded-t-8 bg-neutral-1 shadow-surface-lg-inverted flex w-full max-w-xl select-none',
				className,
			)}
			{...props}
		/>
	);
};

const itemVariant = cva({
	base: 'relative flex flex-1 select-none flex-col items-center gap-1 overflow-hidden py-3 transition-all duration-500 ease-expo-out focus:outline-none focus-visible:bg-accent-2',
	variants: {
		isActive: {
			true: 'text-neutral-12',
			false: 'text-neutral-10',
		},
	},
	defaultVariants: {
		isActive: false,
	},
});

interface TabbarItemProps extends React.ComponentPropsWithoutRef<'div'> {
	isActive?: boolean;
	icon: { active: Icon; inactive: Icon };
}

const Item = forwardRef<HTMLDivElement, TabbarItemProps>(({ icon, children, isActive, className, ...props }, ref) => {
	const Icon = isActive ? icon.active : icon.inactive;

	return (
		<div draggable="false" ref={ref} className={itemVariant({ isActive, className })} {...props}>
			<Icon />
			<p className="label-xs w-full truncate text-center">{children}</p>
		</div>
	);
});

Item.displayName = 'TabbarItem';

export const Tabbar = {
	Container,
	Item,
};
