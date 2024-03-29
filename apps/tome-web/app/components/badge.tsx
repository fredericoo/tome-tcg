import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import { VariantProps, cva } from 'cva';
import { ComponentPropsWithoutRef } from 'react';

const badgeStyles = cva({
	base: 'truncate rounded-full px-3 py-0.5 text-center body-sm',
	variants: {
		variant: {
			default: 'ring-1',
			highContrast: '',
		},
		colorScheme: {
			outline:
				'bg-background-lowest text-copy-lowcontrast-neutral shadow-surface-sm ring-1 ring-border-element-neutral/30',
			primary: '',
			positive: '',
			negative: '',
			warning: '',
		},
	},
	compoundVariants: [
		{
			variant: 'default',
			colorScheme: 'primary',
			className:
				'bg-background-subtle-primary text-copy-lowcontrast-primary shadow-surface-sm ring-border-element-primary/30',
		},
		{
			variant: 'default',
			colorScheme: 'positive',
			className:
				'bg-background-subtle-positive text-copy-lowcontrast-positive shadow-surface-sm ring-border-element-positive/30',
		},
		{
			variant: 'default',
			colorScheme: 'negative',
			className:
				'bg-background-subtle-negative text-copy-lowcontrast-negative shadow-surface-sm ring-border-element-negative/30',
		},
		{
			variant: 'default',
			colorScheme: 'warning',
			className:
				'bg-background-subtle-warning text-copy-lowcontrast-warning shadow-surface-sm ring-border-element-warning/30',
		},
		/** High contrast */
		{
			variant: 'highContrast',
			colorScheme: 'primary',
			className: 'bg-background-strong-primary text-copy-inverted shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'positive',
			className: 'bg-background-strong-positive text-copy-highcontrast-positive shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'negative',
			className: 'bg-background-strong-negative text-copy-inverted shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'warning',
			className: 'bg-background-strong-warning text-copy-inverted shadow-surface-inset',
		},
	],
	defaultVariants: {
		variant: 'default',
		colorScheme: 'outline',
	},
});
type BadgeVariants = VariantProps<typeof badgeStyles>;

export type BadgeProps = {
	asChild?: boolean;
} & BadgeVariants &
	ComponentPropsWithoutRef<'span'>;

export const Badge = ({ asChild, variant, colorScheme, children, className, ...props }: BadgeProps) => {
	const Comp = asChild ? Slot : 'span';

	return (
		<Comp role="status" className={clsx(badgeStyles({ variant, colorScheme }), className)} {...props}>
			{children}
		</Comp>
	);
};
