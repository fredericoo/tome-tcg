import { Slot } from '@radix-ui/react-slot';
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
			outline: 'bg-lowest text-neutral-11 shadow-surface-sm ring-1 ring-neutral-8/20',
			accent: '',
			positive: '',
			negative: '',
			warning: '',
		},
	},
	compoundVariants: [
		{
			variant: 'default',
			colorScheme: 'accent',
			className: 'bg-accent-1 text-accent-10 shadow-surface-sm surface-neutral ring-accent-9/30',
		},
		{
			variant: 'default',
			colorScheme: 'positive',
			className: 'bg-positive-1 text-positive-10 shadow-surface-sm surface-positive ring-positive-9/30',
		},
		{
			variant: 'default',
			colorScheme: 'negative',
			className: 'bg-negative-1 text-negative-10 shadow-surface-sm surface-negative ring-negative-9/30',
		},
		{
			variant: 'default',
			colorScheme: 'warning',
			className: 'bg-warning-1 text-warning-10 shadow-surface-sm surface-warning ring-warning-9/30',
		},
		/** High contrast */
		{
			variant: 'highContrast',
			colorScheme: 'accent',
			className: 'bg-background-strong-primary text-copy-inverted surface-accent shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'positive',
			className: 'bg-background-strong-positive text-copy-highcontrast-positive surface-positive shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'negative',
			className: 'bg-background-strong-negative text-copy-inverted surface-negative shadow-surface-inset',
		},
		{
			variant: 'highContrast',
			colorScheme: 'warning',
			className: 'bg-background-strong-warning text-copy-inverted surface-warning shadow-surface-inset',
		},
	],
	defaultVariants: {
		variant: 'default',
		colorScheme: 'outline',
	},
});
type BadgeVariants = VariantProps<typeof badgeStyles>;

export interface BadgeProps extends ComponentPropsWithoutRef<'span'>, BadgeVariants {
	asChild?: boolean;
}

export const Badge = ({ asChild, variant, colorScheme, children, className, ...props }: BadgeProps) => {
	const Comp = asChild ? Slot : 'span';

	return (
		<Comp role="status" className={badgeStyles({ variant, colorScheme, className })} {...props}>
			{children}
		</Comp>
	);
};
