import { IconCircleCheck, IconPlayerSkipForward } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import type { SelectFromHandMessageSchema } from '../../../../tome-api/src/features/game/game.pubsub';
import { useGameStore } from '../../lib/game.utils';
import { Button } from '../button';
import { GameCard } from './card';
import { opposingSide } from './player-side';

interface PlayerHandProps {
	relative: 'opponent' | 'self';
	onSelectFromHand: ((params: SelectFromHandMessageSchema) => void) | undefined;
}

export function PlayerHand({ relative, onSelectFromHand }: PlayerHandProps) {
	const playerAction = useGameStore(s => s.state?.board[s.state.side].action);
	const isSelectingFromHand = playerAction?.type === 'select_from_hand' && playerAction.config.from === relative;
	const hand = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]].hand,
	);

	const [cardKeysSelectedFromHand, setCardKeysSelectedFromHand] = useState(new Set<number>());
	if (cardKeysSelectedFromHand.size > 0 && playerAction?.type !== 'select_from_hand')
		setCardKeysSelectedFromHand(new Set());

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
				{hand?.map((cardRef, index) => {
					const multiplier = relative === 'self' ? 1 : -1;
					const fanRatio = 0.5 * multiplier;
					const angle = (index + 0.5 - hand.length / 2) * fanRatio;
					const selectedOffset = cardKeysSelectedFromHand.has(cardRef.key) ? -8 : 0;
					const y = (Math.abs(angle) + selectedOffset) * fanRatio * 10;

					return (
						<li
							className="-mx-2 transition-all duration-300 ease-in-out"
							style={{ transform: `rotate(${angle}deg) translateY(${y}px)` }}
							key={cardRef.key}
						>
							<GameCard
								className={isSelectingFromHand ? 'hover:ring-accent-9 hover:ring-2' : undefined}
								onClick={
									isSelectingFromHand ?
										() => {
											flushSync(() => {
												setCardKeysSelectedFromHand(set => {
													if (set.has(cardRef.key)) set.delete(cardRef.key);
													else set.add(cardRef.key);
													// if set is bigger than config, remove the _first_ item
													if (set.size > playerAction.config.max) set.delete(set.values().next().value);
													// if action has min 1 max 1, submit immediately
													return new Set(set);
												});
											});
											if (playerAction.config.max === 1 && cardKeysSelectedFromHand.size === 1)
												onSelectFromHand?.({
													type: 'select_from_hand',
													cardKeys: Array.from(cardKeysSelectedFromHand),
												});
										}
									:	undefined
								}
								size="md"
								info={cardRef}
							/>
						</li>
					);
				})}
			</ol>
			{isSelectingFromHand && (
				<footer aria-label="Actions" className="relative flex items-center justify-center gap-2 shadow-lg">
					{playerAction.config.min === 0 && (
						<Button variant="outline" onClick={() => onSelectFromHand?.({ type: 'select_from_hand', cardKeys: [] })}>
							<IconPlayerSkipForward /> <span>Skip</span>
						</Button>
					)}
					{playerAction.config.max !== 1 && (
						<button
							className="relative flex items-center gap-2 rounded-full bg-neutral-200 py-2 pl-2 pr-4 text-neutral-900 transition-all hover:bg-neutral-100 active:bg-neutral-300"
							onClick={() =>
								onSelectFromHand?.({ type: 'select_from_hand', cardKeys: Array.from(cardKeysSelectedFromHand) })
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
