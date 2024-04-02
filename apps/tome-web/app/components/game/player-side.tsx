import { IconHeart, IconHeartBroken } from '@tabler/icons-react';
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
import { CardPile } from './card-pile';

const stackClass = cva({
	base: 'rounded-4 shadow-surface-inset p-2',
	variants: {
		stack: { red: 'bg-[#FE4D00]', green: 'bg-[#A1BE3F]', blue: 'bg-[#5F6DEE]' },
		interactive: {
			true: 'ring-0 ring-transparent hover:scale-110 hover:shadow-lg cursor-pointer transition-all ease-expo-out duration-300',
		},
		combat: {
			used: 'scale-110',
			'not-used': 'opacity-25',
		},
	},
});

const ActionProgressBar = ({ action }: { action?: GameAction }) => {
	if (!action) return <div className="bg-accent-12/10 relative h-1 w-full"></div>;
	const currentTime = Date.now();
	const totalDuration = action.timesOutAt - action.requestedAt;
	const elapsedTime = currentTime - action.requestedAt;
	const progress = (elapsedTime / totalDuration) * 100;
	const remainingTime = action.timesOutAt - currentTime;

	return (
		<div className="bg-accent-12/10 relative h-1 w-full">
			<div
				style={{ animationDuration: `${remainingTime}ms`, width: `${100 - progress}%` }}
				className="animate-to-zero-width shadow-accent-9/50 bg-accent-9 absolute h-full rounded-r-full shadow-[0_0_6px]"
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
	const hp = boardSide?.hp ?? 0;

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
									className: clsx('relative', { 'z-20': canSelectStack }),
								})}
							>
								<div className="absolute bottom-3 right-3 rounded-full border border-white/25 px-2 py-0.5 text-xs text-white">
									10
								</div>
								{casting && (
									<div className="pointer-events-none absolute z-10 translate-y-1/2">
										<CardPile size="sm" cards={casting} last={casting.length} />
									</div>
								)}
								<CardPile cards={boardSide?.stacks[stack] ?? []} last={2} size="sm" />
							</button>
						</li>
					);
				})}
			</ol>

			<Badge id={absoluteSide ? `${absoluteSide}-hp` : undefined} className="flex items-center gap-2">
				{hp > 0 ?
					<IconHeart />
				:	<IconHeartBroken />}
				<AnimatedNumber className="text-md font-bold tracking-tight">{hp}</AnimatedNumber>
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
