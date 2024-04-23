import { motion } from 'framer-motion';

import { useGameStore } from '../../lib/game.utils';
import { Image } from '../image';
import { getCardImageSrc, isShownCard } from './card';

export const ActiveFieldBg = () => {
	const field = useGameStore(s => s.state?.board.field);
	const activeFieldCard = field?.at(-1);

	if (!activeFieldCard || !isShownCard(activeFieldCard)) return null;

	return (
		<motion.div
			key={activeFieldCard.id}
			initial={{ opacity: 0, scale: 0 }}
			animate={{ opacity: 0.3, scale: 1 }}
			className="pointer-events-none absolute inset-0 z-0"
		>
			<Image
				src={getCardImageSrc(activeFieldCard.id)}
				className=" h-full w-full scale-125 object-cover blur-lg"
				srcWidth="100vw"
			/>
		</motion.div>
	);
};
