import { useGameStore } from '../../lib/game.utils';

export const PlayerActionOverlay = () => {
	const playerBoard = useGameStore(s => s.state?.board[s.state.side]);
	if (!playerBoard?.action) return null;

	return (
		<div className="animate-fade-in pointer-events-none absolute inset-0 z-20 flex w-full items-center justify-center bg-black/50 p-4">
			<p
				key={playerBoard.action.config.message}
				className="animate-action display-xs lg:display-sm text-white [text-shadow:0px_1px_0_black]"
			>
				{playerBoard.action.config.message}
			</p>
		</div>
	);
};
