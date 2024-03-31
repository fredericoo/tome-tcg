import { Link, useNavigation } from '@remix-run/react';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from './button';

export const isDev = import.meta.env.NODE_ENV === 'development';

type ErrorViewProps = {
	error?: unknown;
	heading: string;
	message?: string;
	action?: {
		label: string;
		link: string;
	};
};

export const ErrorView = ({ error, heading, message, action }: ErrorViewProps) => {
	const { state } = useNavigation();

	return (
		<div role="alert" className="bg-negative-1 flex h-full w-full grow flex-col justify-center">
			<div className="pb-32 pt-4">
				<AnimatePresence mode="popLayout">
					{state === 'idle' && (
						<motion.div
							key={Math.random()}
							initial={{ scale: 0.75, opacity: 0 }}
							animate={{ scale: 1, opacity: 1, transition: { delay: 0.3 } }}
							exit={{ scale: 0.75, opacity: 0 }}
							transition={{
								scale: { type: 'spring', bounce: 0.5, duration: 0.6 },
								opacity: { type: 'tween', ease: 'easeOut', duration: 0.3 },
							}}
						>
							<div className="flex flex-col items-center justify-center gap-4">
								<div className="text-center">
									<p className="heading-md text-negative-11 pb-1">{heading}</p>
									{message && <p className="body-md text-neutral-11">{message}</p>}
								</div>

								{action && (
									<Button asChild variant="outline">
										<Link to={action.link}>{action.label}</Link>
									</Button>
								)}

								{isDev && (
									<div className="flex w-full max-w-lg flex-col items-center">
										<h3 className="rounded-4 relative -mb-3 border border-red-700 bg-white px-2 py-1 text-xs font-bold uppercase tracking-widest text-red-900">
											Dev error
										</h3>
										<div className="rounded-4 max-h-[20rem] w-full overflow-scroll border border-red-700 bg-red-50 pt-4 text-xs text-red-700">
											<pre className="px-2 py-2">{JSON.stringify(error)}</pre>
										</div>
									</div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};
