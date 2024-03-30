import clsx from 'clsx';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			className={clsx(
				'border-neutral-4 bg-neutral-1 fr placeholder:text-neutral-10 flex w-full rounded-md border px-3 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
});
Input.displayName = 'Input';

export { Input };
