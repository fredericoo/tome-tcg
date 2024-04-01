import { useGameStore } from '../../lib/game.utils';

export const PlayerActionOverlay = () => {
	const playerBoard = useGameStore(s => s.state?.board[s.state.side]);
	if (!playerBoard?.action) return null;

	return (
		<div className="animate-fade-in bg-neutral-12/50 pointer-events-none fixed inset-0 z-20 flex w-full items-center justify-center p-4">
			<p
				key={playerBoard.action.config.message}
				className="animate-action display-sm text-white [text-shadow:0px_1px_0_black]"
			>
				{playerBoard.action.config.message}
			</p>
		</div>
	);
};
