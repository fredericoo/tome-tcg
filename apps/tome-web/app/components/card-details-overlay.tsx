import { motion } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { create } from 'zustand';

import { PubSubCard } from '../../../tome-api/src/features/game/game.pubsub';
import { useCardData } from '../lib/card-data';
import { Card, isShownCard } from './game/card';

type HoveredCardStore = {
	hoveredCard: PubSubCard | null;
	setHoveredCard: (card: PubSubCard | null) => void;
};
export const useHoveredCard = create<HoveredCardStore>(set => ({
	hoveredCard: null,
	setHoveredCard: hoveredCard => set({ hoveredCard }),
}));

type UseLongPressOptions = {
	threshold?: number;
	onStart?: (event: React.MouseEvent | React.TouchEvent) => void;
	onFinish?: (event: React.MouseEvent | React.TouchEvent) => void;
	onCancel?: (event: React.MouseEvent | React.TouchEvent) => void;
};

function isTouchEvent({ nativeEvent }: React.MouseEvent | React.TouchEvent) {
	return window.TouchEvent ? nativeEvent instanceof TouchEvent : 'touches' in nativeEvent;
}

function isMouseEvent(event: React.MouseEvent | React.TouchEvent) {
	return event.nativeEvent instanceof MouseEvent;
}

export function useLongPress(
	callback: (event: React.MouseEvent | React.TouchEvent) => void,
	options: UseLongPressOptions = {},
) {
	const { threshold = 400, onStart, onFinish, onCancel } = options;
	const isLongPressActive = useRef(false);
	const isPressed = useRef(false);
	const timerId = useRef<Timer | undefined>();

	return useMemo(() => {
		if (typeof callback !== 'function') {
			return {};
		}

		const start = (event: React.MouseEvent | React.TouchEvent) => {
			if (!isMouseEvent(event) && !isTouchEvent(event)) return;

			if (onStart) {
				onStart(event);
			}

			isPressed.current = true;
			timerId.current = setTimeout(() => {
				callback(event);
				isLongPressActive.current = true;
			}, threshold);
		};

		const cancel = (event: React.MouseEvent | React.TouchEvent) => {
			if (!isMouseEvent(event) && !isTouchEvent(event)) return;

			if (isLongPressActive.current) {
				if (onFinish) {
					onFinish(event);
				}
			} else if (isPressed.current) {
				if (onCancel) {
					onCancel(event);
				}
			}

			isLongPressActive.current = false;
			isPressed.current = false;

			if (timerId.current) {
				window.clearTimeout(timerId.current);
			}
		};

		const mouseHandlers = {
			onMouseDown: start,
			onMouseUp: cancel,
			onMouseLeave: cancel,
		};

		const touchHandlers = {
			onTouchStart: start,
			onTouchEnd: cancel,
			onContextMenu: (e: React.MouseEvent | React.TouchEvent) => {
				e.preventDefault();
				e.stopPropagation();
			},
		};

		return {
			...mouseHandlers,
			...touchHandlers,
		};
	}, [callback, threshold, onCancel, onFinish, onStart]);
}

export function useCardHoverEvents(pubsubCard: PubSubCard) {
	const setHovered = useHoveredCard(s => s.setHoveredCard);
	const handlers = useLongPress(() => setHovered(pubsubCard), { threshold: 200 });

	return useMemo(
		() => ({
			...handlers,
			onMouseEnter: (e: React.MouseEvent | React.TouchEvent) => isMouseEvent(e) && setHovered(pubsubCard),
			onMouseLeave: (e: React.MouseEvent | React.TouchEvent) => isMouseEvent(e) && setHovered(null),
		}),
		[handlers, pubsubCard, setHovered],
	);
}

export const CardDetailsOverlay = () => {
	const hoveredCard = useHoveredCard(s => s.hoveredCard);
	const setHoveredCard = useHoveredCard(s => s.setHoveredCard);
	const data = useCardData();

	if (!hoveredCard) return null;
	const card = isShownCard(hoveredCard) ? data[hoveredCard.id] : undefined;
	if (!card) return null;

	return (
		<motion.div
			initial={{ backdropFilter: 'blur(0px)' }}
			animate={{ backdropFilter: 'blur(8px)' }}
			exit={{ backdropFilter: 'blur(0px)' }}
			onClick={e => {
				e.preventDefault();
				e.stopPropagation();
				setHoveredCard(null);
			}}
			className="pointer-fine:pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		>
			<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
				<Card className="h-[40vh] shadow-xl" size="lg" face="front" pubsubCard={hoveredCard} />
			</motion.div>
		</motion.div>
	);
};
