import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import { VariantProps, cva } from 'cva';
import * as React from 'react';

const buttonVariants = cva({
	base: 'button inline-flex items-center justify-center fr gap-2 whitespace-nowrap rounded-full text-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
	variants: {
		variant: {
			accent: 'bg-accent-10 hover:bg-accent-11 active:bg-accent-12 text-accent-1',
			destructive: 'bg-error-10 hover:bg-error-11 active:bg-error-12 text-error-1',
			outline:
				'border border-neutral-4 bg-transparent hover:bg-neutral-1 hover:border-neutral-5 active:border-neutral-6 text-neutral-12',
			ghost: 'hover:bg-accent-3 hover:text-accent-11 active:bg-accent-4',
			link: 'text-accent-10 underline-offset-4 hover:underline active:text-accent-11',
		},
		size: {
			sm: 'px-3',
			md: 'px-5 py-2.5 has-[svg:first-child:not(:only-child)]:pl-3 has-[svg:last-child:not(:only-child)]:pr-3',
			lg: 'px-8',
			icon: 'h-10 w-10',
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
