import clsx from 'clsx';

import type { Board } from '../../../../tome-api/src/features/engine/engine.board';
import { useGameStore } from '../../lib/game.utils';

const PHASES: Array<Board['phase']> = [
	'draw',
	'prepare',
	'reveal',
	'field-clash',
	'cast-spell',
	'spell-clash',
	'damage',
];

export const TurnPhaseMeter = () => {
	const currentPhase = useGameStore(s => s.state?.board.phase);
	return (
		<ol aria-label="Turn phases" className="flex flex-1 flex-col items-end px-4">
			{PHASES.map(phase => {
				const isCurrent = phase === currentPhase;
				return (
					<li
						className={clsx('font-bold transition-all', {
							'text-xl': isCurrent,
							'text-xs opacity-60': !isCurrent,
						})}
						key={phase}
					>
						{phase}
					</li>
				);
			})}
		</ol>
	);
};
