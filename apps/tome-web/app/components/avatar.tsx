import * as AvatarPrimitive from '@radix-ui/react-avatar';
import clsx from 'clsx';
import type { VariantProps } from 'cva';
import { cva } from 'cva';
import * as React from 'react';

const avatarVariants = cva({
	base: '@container relative flex shrink-0 overflow-hidden border text-neutral-11  border-neutral-4 rounded-full fr',
	variants: {
		size: {
			xl: 'h-16 w-16',
			lg: 'h-12 w-12',
			md: 'h-10 w-10',
			sm: 'h-8 w-8',
			xs: 'h-6 w-6',
		},
	},
	defaultVariants: {
		size: 'md',
	},
});

type AvatarVariants = VariantProps<typeof avatarVariants>;
export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, AvatarVariants {}
const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
	({ className, size, ...props }, ref) => (
		<AvatarPrimitive.Root ref={ref} className={avatarVariants({ size, className })} {...props} />
	),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}
const AvatarImage = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Image>, AvatarImageProps>(
	({ className, ...props }, ref) => (
		<AvatarPrimitive.Image ref={ref} className={clsx('aspect-square h-full w-full', className)} {...props} />
	),
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}
const AvatarFallback = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Fallback>, AvatarFallbackProps>(
	({ className, ...props }, ref) => (
		<AvatarPrimitive.Fallback
			ref={ref}
			className={clsx(
				'bg-neutral-2 flex h-full w-full items-center justify-center rounded-full text-[50cqi]',
				className,
			)}
			{...props}
		/>
	),
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
