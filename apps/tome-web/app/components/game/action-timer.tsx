import { memo } from 'react';

import { useGameStore } from '../../lib/game.utils';
import { opposingSide } from './player-side';

export const ActionTimer = memo(({ relative }: { relative: 'opponent' | 'self' }) => {
	const action = useGameStore(
		s => s.state?.board[{ self: s.state.side, opponent: opposingSide(s.state.side) }[relative]].action,
	);

	if (!action) return <div className="bg-accent-12/10 relative h-1 w-full"></div>;

	const currentTime = Date.now();
	const totalDuration = action.timesOutAt - action.requestedAt;
	const elapsedTime = currentTime - action.requestedAt;
	const progress = (elapsedTime / totalDuration) * 100;
	const remainingTime = action.timesOutAt - currentTime;

	return (
		<div className="bg-accent-12/10 relative h-1 w-full">
			<div
				// Key is used to force re-render when the component is re-rendered
				key={currentTime.toString()}
				style={{ animationDuration: `${remainingTime}ms`, width: `${100 - progress}%` }}
				className="animate-to-zero-width shadow-accent-9/50 bg-accent-9 absolute h-full rounded-r-full shadow-[0_0_6px]"
			/>
		</div>
	);
});

ActionTimer.displayName = 'ActionTimer';
