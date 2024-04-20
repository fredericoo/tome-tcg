import { Icon, IconProps } from '@tabler/icons-react';
import clsx from 'clsx';
import { ComponentPropsWithoutRef, ForwardRefExoticComponent, ReactNode, RefAttributes, forwardRef } from 'react';

type IconComponent = ForwardRefExoticComponent<Omit<IconProps, 'ref'> & RefAttributes<Icon>>;

const Header = ({ children }: { children?: ReactNode }) => {
	return <header className="flex flex-grow gap-4 py-1 pl-3">{children}</header>;
};

interface SectionCardTitleProps extends ComponentPropsWithoutRef<'div'> {
	Icon?: IconComponent;
	children?: ReactNode;
}
const TitleBar = forwardRef<HTMLDivElement, SectionCardTitleProps>(({ children, Icon, className, ...props }, ref) => (
	<div ref={ref} className={clsx('flex flex-grow gap-2', className)} {...props}>
		{Icon ?
			<Icon aria-hidden />
		:	null}
		{children}
	</div>
));
TitleBar.displayName = 'TitleBar';

interface SectionCardContentProps extends ComponentPropsWithoutRef<'div'> {
	children?: ReactNode;
}
const Content = ({ children, className, ...props }: SectionCardContentProps) => (
	<div
		className={clsx('bg-lowest rounded-4 shadow-surface-md surface-neutral ring-neutral-9/10 ring-1', className)}
		{...props}
	>
		{children}
	</div>
);

const Root = ({ children }: { children?: ReactNode }) => {
	return (
		<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-screen-lg flex-col gap-2 p-2">
			{children}
		</section>
	);
};

export const SectionCard = { Root, Content, Header, TitleBar };
