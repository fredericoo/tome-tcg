import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import { VariantProps, cva } from 'cva';
import * as React from 'react';

const buttonVariants = cva({
	base: 'button flex items-center justify-center fr whitespace-nowrap font-medium transition-all ease-expo-out duration-200 disabled:pointer-events-none disabled:opacity-50',
	variants: {
		variant: {
			accent: 'bg-accent-10 hover:bg-accent-11 active:bg-accent-12 text-white shadow-surface-md surface-accent',
			destructive: 'bg-negative-10 hover:bg-negative-11 active:bg-negative-12 text-negative-1',
			outline:
				'border bg-lowest border-neutral-4 bg-transparent hover:bg-neutral-1 hover:border-neutral-5 active:border-neutral-6 text-neutral-12',
			ghost: 'text-neutral-11 hover:bg-neutral-11/5 hover:text-neutral-12 active:bg-neutral-11/10',
			link: 'text-accent-10 underline-offset-4 hover:underline active:text-accent-11',
		},
		size: {
			sm: 'rounded-full text-sm gap-1 px-3 py-1.5 has-[svg:first-child:not(:only-child)]:pl-2 has-[svg:last-child:not(:only-child)]:pr-2',
			md: 'rounded-full text-md gap-2 px-5 py-2.5 has-[svg:first-child:not(:only-child)]:pl-3 has-[svg:last-child:not(:only-child)]:pr-3',
			lg: 'rounded-full px-8',
			icon: 'rounded-1 h-8 w-8',
		},
	},
	defaultVariants: {
		variant: 'accent',
		size: 'md',
	},
});

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, children, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp className={clsx(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
				{children}
			</Comp>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
