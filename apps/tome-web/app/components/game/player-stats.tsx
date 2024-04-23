import { IconCards, IconHeart, IconHeartBroken, IconHeartFilled } from '@tabler/icons-react';

import { useGameStore } from '../../lib/game.utils';
import { Badge } from '../badge';
import { AnimatedNumber } from './animated-number';
import { opposingSide } from './player-side';
import { getVfxId } from './vfx-canvas';

export const PlayerStats = ({ relative }: { relative: 'opponent' | 'self' }) => {
	const absoluteSide = useGameStore(s =>
		s.state ? { self: s.state.side, opponent: opposingSide(s.state.side) }[relative] : undefined,
	);
	const hp = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]].hp,
	);
	const deckSize = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]].drawPile.length,
	);

	if (!hp) return null;

	return (
		<div className="flex items-center gap-2 p-1">
			<div className="flex flex-1">
				<Badge className="flex items-center gap-1 pl-1.5 pr-2">
					<IconCards /> {deckSize}
				</Badge>
			</div>
			<Badge
				colorScheme="accent"
				id={absoluteSide ? getVfxId({ type: 'player', side: absoluteSide }) : undefined}
				className="flex items-center gap-1 pl-1.5 pr-2"
			>
				{hp === 100 ?
					<IconHeartFilled />
				: hp > 0 ?
					<IconHeart />
				:	<IconHeartBroken />}
				<AnimatedNumber className="label-md">{hp}</AnimatedNumber>
			</Badge>
			<div className="flex-1"></div>
		</div>
	);
};
