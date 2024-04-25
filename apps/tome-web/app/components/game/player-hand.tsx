import { IconCircleCheck, IconPlayerSkipForward } from '@tabler/icons-react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import type { PubSubCard, SelectFromHandMessageSchema } from '../../../../tome-api/src/features/game/game.pubsub';
import { useGameStore } from '../../lib/game.utils';
import { Button } from '../button';
import { useCardHoverEvents } from '../card-details-overlay';
import { GameCard } from './card';
import { opposingSide } from './player-side';
import { PlayerStats } from './player-stats';

interface PlayerHandProps {
	relative: 'opponent' | 'self';
	onSelectFromHand: ((params: SelectFromHandMessageSchema) => void) | undefined;
}

const HandCard = ({
	parentRef,
	pubsubCard,
	interactive,
	onSelect,
	relative,
}: {
	parentRef: React.RefObject<HTMLUListElement>;
	pubsubCard: PubSubCard;
	interactive: boolean;
	onSelect: (pubsubCard: PubSubCard) => void;
	relative: 'opponent' | 'self';
}) => {
	const ref = useRef<HTMLLIElement>(null);
	const { scrollXProgress } = useScroll({
		container: parentRef,
		target: ref,
		axis: 'x',
		offset: ['start end', 'end start'],
		layoutEffect: false,
	});
	const style = {
		rotateZ: useTransform(() => {
			const multiplier = relative === 'self' ? 1 : -1;
			const diff = scrollXProgress.get() - 0.5;
			return Math.tanh(diff * -1) * 10 * multiplier;
		}),
		y: useTransform(() => {
			const multiplier = relative === 'self' ? 1 : -1;
			const diff = scrollXProgress.get() - 0.5;
			return diff * diff * 128 * multiplier;
		}),
	};
	const handlers = useCardHoverEvents(pubsubCard);

	if (!interactive)
		return (
			<motion.li ref={ref} style={style} {...handlers}>
				<GameCard size="md" info={pubsubCard} />
			</motion.li>
		);

	return (
		<motion.li style={style} ref={ref} {...handlers}>
			<button className="m-0 block p-0" onClick={() => onSelect(pubsubCard)}>
				<GameCard
					className={interactive ? 'hover:ring-accent-9/80 hover:ring-4' : undefined}
					size="md"
					info={pubsubCard}
				/>
			</button>
		</motion.li>
	);
};
export function PlayerHand({ relative, onSelectFromHand }: PlayerHandProps) {
	const ref = useRef<HTMLUListElement>(null);
	const playerAction = useGameStore(s => s.state?.board[s.state.side].action);
	const isSelectingFromHand = playerAction?.type === 'select_from_hand' && playerAction.config.from === relative;
	const hand = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]].hand,
	);
	const [cardKeysSelectedFromHand, setCardKeysSelectedFromHand] = useState(new Set<number>());
	// reset whenever not selecting from hand anymore
	if (playerAction?.type !== 'select_from_hand' && cardKeysSelectedFromHand.size > 0)
		setCardKeysSelectedFromHand(new Set());
	useEffect(() => {
		if (playerAction?.config.max === 1 && cardKeysSelectedFromHand.size === 1)
			onSelectFromHand?.({
				type: 'select_from_hand',
				cardKeys: Array.from(cardKeysSelectedFromHand),
			});
	}, [cardKeysSelectedFromHand, onSelectFromHand, playerAction?.config.max]);

	return (
		<div
			className={clsx('bg-neutral-12/20 md:rounded-4 relative mx-auto flex w-full max-w-screen-md flex-col', {
				'z-20': isSelectingFromHand,
				'flex-col-reverse': relative === 'opponent',
			})}
		>
			<PlayerStats relative={relative} />

			<ul
				ref={ref}
				aria-label="Hand"
				className={clsx(
					'hide-scrollbars md:rounded-4 group relative flex w-full overflow-x-auto overflow-y-clip overscroll-contain px-[calc(50%-(63/88)*15vh/2)] py-2 transition-transform',
				)}
			>
				{hand?.map(pubsubCard => {
					return (
						<HandCard
							relative={relative}
							parentRef={ref}
							key={pubsubCard.key}
							interactive={isSelectingFromHand}
							pubsubCard={pubsubCard}
							onSelect={pubsubCard => {
								if (!playerAction) return;
								setCardKeysSelectedFromHand(prev => {
									const next = new Set(prev);
									if (next.has(pubsubCard.key)) next.delete(pubsubCard.key);
									else next.add(pubsubCard.key);
									return next;
								});
							}}
						/>
					);
				})}
			</ul>
			{isSelectingFromHand && (
				<footer aria-label="Actions" className="absolute bottom-0 flex items-center justify-center gap-2 p-2">
					{playerAction.config.min === 0 && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								onSelectFromHand?.({ type: 'select_from_hand', cardKeys: [] });
							}}
						>
							<IconPlayerSkipForward /> <span>Skip</span>
						</Button>
					)}
					{playerAction.config.max !== 1 && (
						<Button
							variant="accent"
							size="sm"
							onClick={() => {
								onSelectFromHand?.({ type: 'select_from_hand', cardKeys: Array.from(cardKeysSelectedFromHand) });
							}}
						>
							<IconCircleCheck /> Confirm
						</Button>
					)}
				</footer>
			)}
		</div>
	);
}
