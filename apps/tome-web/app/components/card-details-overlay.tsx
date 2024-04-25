import { motion } from 'framer-motion';

import { useCardData } from '../lib/card-data';
import { Card, isShownCard, useHoveredCard } from './game/card';

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
			onContextMenu={e => {
				e.stopPropagation();
				e.preventDefault();
			}}
			className="pointer-fine:pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		>
			<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
				<Card className="h-[40vh] shadow-xl" size="lg" face="front" pubsubCard={hoveredCard} />
			</motion.div>
		</motion.div>
	);
};
