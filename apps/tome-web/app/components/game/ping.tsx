import { useGameStore } from '../../lib/game.utils';

export const Ping = () => {
	const sentAt = useGameStore(s => s.state?.sentAt);
	if (!sentAt) return null;
	const now = Date.now();
	const ping = sentAt ? now - sentAt : undefined;
	if (!ping) return null;
	return <div className="label-xs text-neutral-7 px-2">{Math.abs(ping)}ms</div>;
};
