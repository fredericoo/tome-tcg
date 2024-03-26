import clsx from 'clsx';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import { type Side } from '../../../../tome-api/src/features/engine/engine.game';
import type {
	SanitisedIteration,
	SelectFromHandMessageSchema,
} from '../../../../tome-api/src/features/game/game.pubsub';
import { invariant } from '../../../../tome-api/src/lib/utils';
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
		<>
			<ol
				aria-label="Hand"
				className={clsx(
					'group absolute left-1/2 flex flex-grow -translate-x-1/2  justify-center p-2 transition-transform',
					{
						'bottom-0 translate-y-1/4 hover:translate-y-0': relative === 'self',
						'top-0 -translate-y-1/4': relative === 'opponent',
						'z-20 translate-y-0': isSelectingFromHand,
					},
				)}
			>
				{side.hand.map((cardRef, index) => {
					// fan out the cards
					const multiplier = relative === 'self' ? 1 : -1;
					const fanRatio = 0.5 * multiplier;
					const angle = (index + 0.5 - side.hand.length / 2) * fanRatio;
					// the bigger the angle, the higher the y, in a circular fashion
					const y = Math.abs(angle) * fanRatio * 10;
					return (
						<li
							className="-mx-2 transition-all duration-300 ease-in-out group-hover:-mx-1"
							style={{ transform: `rotate(${angle}deg) translateY(${y}px)` }}
							key={cardRef.key}
						>
							<Card
								interactive={isSelectingFromHand}
								highlight={cardKeysSelectedFromHand.has(cardRef.key) ? 'effect' : undefined}
								onClick={
									isSelectingFromHand ?
										() => {
											flushSync(() => {
												setCardKeysSelectedFromHand(set => {
													if (set.has(cardRef.key)) {
														set.delete(cardRef.key);
														return set;
													}
													return set.add(cardRef.key);
												});
											});
											invariant(action?.type === 'select_from_hand', 'Invalid action type');
											if (
												cardKeysSelectedFromHand.size >= action.config.min &&
												cardKeysSelectedFromHand.size <= action.config.max
											) {
												onSelectFromHand({ type: 'select_from_hand', cardKeys: Array.from(cardKeysSelectedFromHand) });
											}
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
		</>
	);
}
