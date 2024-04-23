import clsx from 'clsx';
import { cva } from 'cva';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import { COLORS, Side, SpellColor } from '../../../../tome-api/src/features/engine/engine.game';
import type { SelectStackMessageSchema } from '../../../../tome-api/src/features/game/game.pubsub';
import { invariant } from '../../../../tome-api/src/lib/utils';
import { useGameStore } from '../../lib/game.utils';
import { ActionTimer } from './action-timer';
import { cardClass, cardSizeToClass } from './card';
import { CardPile } from './card-pile';
import { getVfxId } from './vfx-canvas';

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
		<div className={clsx('flex flex-col items-center gap-2 ', { 'flex-col-reverse': relative === 'opponent' })}>
			<ActionTimer relative={relative} />

			<ol aria-label="Spell stacks" className={clsx('flex gap-4 px-4')}>
				{COLORS.map(stack => {
					const canSelectStack = isSelectingStack && playerAction.config.availableStacks.includes(stack);
					const casting = boardSide?.casting[stack];
					const topOfStack = boardSide?.stacks[stack].at(-1);
					return (
						<li key={stack} id={absoluteSide ? getVfxId({ type: 'stack', side: absoluteSide, stack }) : undefined}>
							<button
								id={`stack-${topOfStack?.key || stack}`}
								disabled={!canSelectStack}
								aria-label={stack}
								onClick={() => {
									if (!canSelectStack) return;
									flushSync(() => {
										setSelectedStacks(set => {
											if (set.has(stack)) {
												set.delete(stack);
												return set;
											}
											return set.add(stack);
										});
									});
									invariant(playerAction?.type === 'select_spell_stack', 'Invalid action type');
									if (
										selectedStacks.size >= playerAction.config.min &&
										selectedStacks.size <= playerAction.config.max
									) {
										console.log('selected' + Array.from(selectedStacks));
										onSelectStack?.({ type: 'select_spell_stack', stacks: Array.from(selectedStacks) });
									}
								}}
								className={stackClass({
									stack,
									interactive: canSelectStack,
									className: clsx('relative', { 'z-20': canSelectStack }),
								})}
							>
								{casting && (
									<div className="pointer-events-none absolute z-10 translate-y-1/2">
										<CardPile size="sm" cards={casting} last={casting.length} />
									</div>
								)}
								{boardSide?.stacks[stack] && boardSide?.stacks[stack].length > 0 ?
									<CardPile cards={boardSide?.stacks[stack]} last={30} size="sm" variant="pile" />
								:	<div className={cardClass({ className: cardSizeToClass['sm'] })}>
										<div className="absolute bottom-3 right-3 rounded-full border border-white/25 px-2 py-0.5 text-xs text-white">
											10
										</div>
									</div>
								}
							</button>
						</li>
					);
				})}
			</ol>
		</div>
	);
};
