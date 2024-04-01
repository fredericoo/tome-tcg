import clsx from 'clsx';
import { cva } from 'cva';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import { COLORS, GameAction, Side, SpellColor } from '../../../../tome-api/src/features/engine/engine.game';
import { SelectStackMessageSchema } from '../../../../tome-api/src/features/game/game.pubsub';
import { invariant } from '../../../../tome-api/src/lib/utils';
import { useGameStore } from '../../lib/game.utils';
import { Badge } from '../badge';
import { AnimatedNumber } from './animated-number';
import { Card } from './card';
import { CardPile } from './card-pile';

const stackClass = cva({
	base: 'rounded-4 shadow-surface-inset p-2',
	variants: {
		stack: { red: 'bg-[#FE4D00]', green: 'bg-[#A1BE3F]', blue: 'bg-[#5F6DEE]' },
		interactive: {
			true: 'ring-0 ring-transparent hover:ring-8 hover:ring-teal-500/20 cursor-pointer transition-shadow',
		},
		combat: {
			used: 'scale-110',
			'not-used': 'opacity-25',
		},
	},
});

const ActionProgressBar = ({ action }: { action?: GameAction }) => {
	if (!action) return <div className="bg-accent-3 relative h-1 w-full"></div>;
	const now = Date.now();
	const durationMs = action.timesOutAt - now;

	// return seconds remaining
	return (
		<div className="bg-accent-3 relative h-1 w-full">
			<div
				style={{ animationDuration: `${durationMs}ms` }}
				className="animate-to-zero-width bg-accent-9 absolute h-full rounded-full"
			/>
		</div>
	);
};
interface PlayerSideProps {
	relative: 'opponent' | 'self';
	onSelectStack: ((params: SelectStackMessageSchema) => void) | undefined;
}

export const opposingSide = (side: Side): Side => (side === 'sideA' ? 'sideB' : 'sideA');

export const PlayerSide = ({ relative, onSelectStack }: PlayerSideProps) => {
	const absoluteSide = useGameStore(s =>
		s.state ? { self: s.state.side, opponent: opposingSide(s.state.side) }[relative] : undefined,
	);
	const playerAction = useGameStore(s => s.state?.board[s.state.side].action);
	const isSelectingStack = playerAction?.type === 'select_spell_stack' && playerAction?.config.from === relative;
	const boardSide = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]],
	);

	const [selectedStacks, setSelectedStacks] = useState<Set<SpellColor>>(new Set());
	if (selectedStacks.size > 0 && playerAction?.type !== 'select_spell_stack') setSelectedStacks(new Set());

	return (
		<div className={clsx('flex flex-col items-center gap-2', { 'flex-col-reverse': relative === 'opponent' })}>
			<ActionProgressBar action={boardSide?.action} />

			<ol aria-label="Spell stacks" className={clsx('flex gap-4 px-4')}>
				{COLORS.map(stack => {
					const canSelectStack = isSelectingStack && playerAction.config.availableStacks.includes(stack);
					const casting = boardSide?.casting[stack];
					const topOfStack = boardSide?.stacks[stack].at(-1);
					return (
						<li key={stack}>
							<button
								id={`stack-${topOfStack?.key || stack}`}
								disabled={!canSelectStack}
								aria-label={stack}
								onClick={
									canSelectStack ?
										() => {
											flushSync(() =>
												setSelectedStacks(set => {
													if (set.has(stack)) {
														set.delete(stack);
														return set;
													}
													return set.add(stack);
												}),
											);
											invariant(playerAction?.type === 'select_spell_stack', 'Invalid action type');
											if (
												selectedStacks.size >= playerAction.config.min &&
												selectedStacks.size <= playerAction.config.max
											) {
												onSelectStack?.({ type: 'select_spell_stack', stacks: Array.from(selectedStacks) });
											}
										}
									:	undefined
								}
								className={stackClass({
									stack,
									interactive: canSelectStack,
									className: clsx({ 'relative z-20': canSelectStack }),
								})}
							>
								{casting && (
									<div className="absolute translate-y-1/2">
										<Card size="sm" card={casting} />
									</div>
								)}
								<CardPile cards={boardSide?.stacks[stack] ?? []} last={2} size="sm" />
							</button>
						</li>
					);
				})}
			</ol>

			<Badge id={absoluteSide ? `${absoluteSide}-hp` : undefined} className="flex items-center gap-2">
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M1.35248 4.90532C1.35248 2.94498 2.936 1.35248 4.89346 1.35248C6.25769 1.35248 6.86058 1.92336 7.50002 2.93545C8.13946 1.92336 8.74235 1.35248 10.1066 1.35248C12.064 1.35248 13.6476 2.94498 13.6476 4.90532C13.6476 6.74041 12.6013 8.50508 11.4008 9.96927C10.2636 11.3562 8.92194 12.5508 8.00601 13.3664C7.94645 13.4194 7.88869 13.4709 7.83291 13.5206C7.64324 13.6899 7.3568 13.6899 7.16713 13.5206C7.11135 13.4709 7.05359 13.4194 6.99403 13.3664C6.0781 12.5508 4.73641 11.3562 3.59926 9.96927C2.39872 8.50508 1.35248 6.74041 1.35248 4.90532Z"
						fill="currentColor"
						fillRule="evenodd"
						clipRule="evenodd"
					></path>
				</svg>
				<AnimatedNumber className="text-md font-bold tracking-tight">{boardSide?.hp ?? 0}</AnimatedNumber>
			</Badge>

			<div
				className={clsx('flex w-full justify-between p-4', {
					'flex-row-reverse items-start': relative === 'opponent',
					'items-end': relative === 'self',
				})}
			>
				<CardPile aria-label="Draw pile" cards={boardSide?.drawPile ?? []} last={2} size="sm" />
			</div>
		</div>
	);
};
