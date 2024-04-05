import { GameCard, Side } from './engine.game';

interface BaseLog {
	timestamp: number;
}

export type MessageMention =
	| {
			type: 'card';
			card: GameCard;
	  }
	| {
			type: 'player';
			side: Side;
	  };

interface MessageLog extends BaseLog {
	type: 'log' | 'error';
	/** You may use dynamic variabless in handlebars format (e.g.: `{{card}}` ) and pass them  to `dynamic` with a value. */
	text: string;
	dynamic?: Record<string, MessageMention>;
}

export type LogIteration = MessageLog;

export const log = (msg: Omit<LogIteration, 'timestamp'>): LogIteration => ({ ...msg, timestamp: Date.now() });

type SanitisedMessageMention = { type: 'card'; id: string; key: number } | { type: 'player'; side: Side };
export interface SanitisedLogIteration extends BaseLog {
	type: 'log' | 'error';
	/** You may use dynamic variabless in handlebars format (e.g.: `{{card}}` ) and pass them  to `dynamic` with a value. */
	text: string;
	dynamic?: Record<string, SanitisedMessageMention>;
}

export const sanitiseLog = (log: LogIteration): SanitisedLogIteration => {
	return {
		text: log.text,
		timestamp: log.timestamp,
		type: log.type,
		dynamic:
			log.dynamic ?
				Object.fromEntries(
					Object.entries(log.dynamic).map(([k, v]) => [
						k,
						v.type === 'card' ? { type: v.type, id: v.card.id, key: v.card.key } : v,
					]),
				)
			:	undefined,
	};
};
