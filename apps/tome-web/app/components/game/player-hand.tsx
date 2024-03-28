import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import { type Side } from '../../../../tome-api/src/features/engine/engine.game';
import type {
	SanitisedIteration,
	SelectFromHandMessageSchema,
} from '../../../../tome-api/src/features/game/game.pubsub';
import { Card } from './card';

interface PlayerHandProps {
	side: SanitisedIteration['board'][Side];
	action: SanitisedIteration['board'][Side]['action'] | null;
	relative: 'opponent' | 'self';
	onSelectFromHand: (params: SelectFromHandMessageSchema) => void;
}

export function PlayerHand({ relative, side, action, onSelectFromHand }: PlayerHandProps) {
	const isSelectingFromHand = action?.type === 'select_from_hand' && action.config.from === relative;
	const [cardKeysSelectedFromHand, setCardKeysSelectedFromHand] = useState<Set<number>>(new Set());
	if (cardKeysSelectedFromHand.size > 0 && action?.type !== 'select_from_hand') setCardKeysSelectedFromHand(new Set());

	return (
		<div
			className={clsx('absolute left-1/2 flex -translate-x-1/2 flex-col items-center', {
				'bottom-0': relative === 'self',
				'top-0': relative === 'opponent',
				'z-20': isSelectingFromHand,
			})}
		>
			<ol
				aria-label="Hand"
				className={clsx('group flex flex-grow justify-center p-2 transition-transform', {
					'translate-y-1/4': relative === 'self',
					'-translate-y-1/4': relative === 'opponent',
					'translate-y-3': isSelectingFromHand,
				})}
			>
				{side.hand.map((cardRef, index) => {
					const multiplier = relative === 'self' ? 1 : -1;
					const fanRatio = 0.5 * multiplier;
					const angle = (index + 0.5 - side.hand.length / 2) * fanRatio;
					const selectedOffset = cardKeysSelectedFromHand.has(cardRef.key) ? -8 : 0;
					const y = (Math.abs(angle) + selectedOffset) * fanRatio * 10;
					return (
						<li
							className="-mx-2 transition-all duration-300 ease-in-out"
							style={{ transform: `rotate(${angle}deg) translateY(${y}px)` }}
							key={cardRef.key}
						>
							<Card
								interactive={isSelectingFromHand}
								onClick={
									isSelectingFromHand ?
										() => {
											flushSync(() => {
												setCardKeysSelectedFromHand(set => {
													if (set.has(cardRef.key)) set.delete(cardRef.key);
													else set.add(cardRef.key);
													// if set is bigger than config, remove the _first_ item
													if (set.size > action.config.max) set.delete(set.values().next().value);
													// if action has min 1 max 1, submit immediately
													return new Set(set);
												});
											});
											if (action.config.max === 1 && cardKeysSelectedFromHand.size === 1)
												onSelectFromHand({ type: 'select_from_hand', cardKeys: Array.from(cardKeysSelectedFromHand) });
										}
									:	undefined
								}
								size="sm"
								card={cardRef}
							/>
						</li>
					);
				})}
			</ol>
			{isSelectingFromHand && (
				<footer
					aria-label="Actions"
					className="relative mb-2 flex items-center justify-center gap-2 rounded-full bg-neutral-900/50 p-2 shadow-lg backdrop-blur-md backdrop-saturate-150"
				>
					{action.config.min === 0 && (
						<button
							className="relative flex items-center gap-2 rounded-full bg-red-600 py-2 pl-2 pr-4 text-white transition-all hover:bg-red-500 active:bg-red-600"
							onClick={() => onSelectFromHand({ type: 'select_from_hand', cardKeys: [] })}
						>
							<IconCircleX /> Skip
						</button>
					)}
					{action.config.max !== 1 && (
						<button
							className="relative flex items-center gap-2 rounded-full bg-neutral-200 py-2 pl-2 pr-4 text-neutral-900 transition-all hover:bg-neutral-100 active:bg-neutral-300"
							onClick={() =>
								onSelectFromHand({ type: 'select_from_hand', cardKeys: Array.from(cardKeysSelectedFromHand) })
							}
						>
							<IconCircleCheck /> Confirm
						</button>
					)}
				</footer>
			)}
		</div>
	);
}
