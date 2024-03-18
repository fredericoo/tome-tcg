import { Value } from '@sinclair/typebox/value';
import chalk from 'chalk';
import { Elysia, Static, t } from 'elysia';

import { delay } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { deck } from '../card/card.fns';
import { Board } from '../engine/engine.board';
import {
	GameCard,
	GameIterationResponse,
	SIDES,
	STACKS,
	Side,
	SpellStack,
	createGameInstance,
} from '../engine/engine.game';
import { PlayerActionMap } from '../engine/engine.turn.actions';
import { getGameById } from './game.api';

type GameRoomState = {
	connections: {
		sideA: { id: string; send: (data: any) => void } | undefined;
		sideB: { id: string; send: (data: any) => void } | undefined;
	};
	lastState: GameIterationResponse | undefined;
};

/** Card info that gets sent over the websockets connection */
export type PubSubCard = { key: number; id?: string };

export type SanitisedIteration = {
	side: Side;
	board: { phase: Board['phase']; field: PubSubCard[] } & Record<
		Side,
		{
			hp: number;
			casting: Partial<Record<'field' | SpellStack, PubSubCard>>;
			drawPile: PubSubCard[];
			discardPile: PubSubCard[];
			hand: PubSubCard[];
			stacks: Record<SpellStack, PubSubCard[]>;
			action?: {
				[A in keyof PlayerActionMap]: {
					type: A;
					config: PlayerActionMap[A]['config'];
					submit: PlayerActionMap[A]['onAction'];
					timesOutAt: number;
				};
			}[keyof PlayerActionMap];
		}
	>;
};

export type PubSubError = { error: string };

const hideCard = (card: GameCard): PubSubCard => ({ key: card.key });
const showCard = (card: GameCard): PubSubCard => ({ key: card.key, id: card.id });
/**
 * Clears data that’s not supposed to make it to end users.
 * E.g.: Deck cards are never supposed to be sent to the client.
 */
const sanitiseIteration = (playerSide: Side, originalIteration: GameIterationResponse) => {
	const iteration: SanitisedIteration = {
		side: playerSide,
		board: {
			field: originalIteration.board.field.map(card => ({ key: card.key })),
			phase: originalIteration.board.phase,
			sideA: {
				hp: originalIteration.board.players.sideA.hp,
				casting: {},
				discardPile: [],
				drawPile: [],
				hand: [],
				stacks: {
					blue: [],
					green: [],
					red: [],
				},
			},
			sideB: {
				hp: originalIteration.board.players.sideB.hp,
				casting: {},
				discardPile: [],
				drawPile: [],
				hand: [],
				stacks: {
					blue: [],
					green: [],
					red: [],
				},
			},
		},
	};
	SIDES.forEach(side => {
		const hideUnlessOwner = side === playerSide ? showCard : hideCard;
		iteration.board[side].drawPile = originalIteration.board.players[side].drawPile.map(hideCard);
		iteration.board[side].discardPile = originalIteration.board.players[side].discardPile.map(hideCard);
		iteration.board[side].hand = originalIteration.board.players[side].hand.map(hideUnlessOwner);
		// everyone can see the stacks
		STACKS.forEach(stack => {
			iteration.board[side].stacks[stack] = originalIteration.board.players[side].stacks[stack].map(showCard);

			const casting = originalIteration.board.players[side].casting[stack];
			if (casting) {
				iteration.board[side].casting[stack] = hideCard(casting);
			}
		});
		const castingField = originalIteration.board.players[side].casting.field;
		if (castingField) {
			iteration.board[side].casting.field = hideCard(castingField);
		}
		iteration.board[side].action = originalIteration.actions?.[side];
	});
	return iteration;
};

const createGameRoom = () => {
	const game = createGameInstance({
		// Mock decks for testing
		decks: { sideA: deck, sideB: deck },
		settings: { castTimeoutMs: 10000000, spellTimeoutMs: 10000000 },
	});
	const state: GameRoomState = {
		connections: { sideA: undefined, sideB: undefined },
		lastState: undefined,
	};

	const handleGame = async () => {
		for await (const iteration of game) {
			state.lastState = iteration;
			SIDES.forEach(side => state.connections[side]?.send(iteration));
			await delay(1000);
		}
	};
	handleGame();

	return {
		state,
		join: (side: Side, connectionId: string, sendFn: (data: SanitisedIteration) => void) => {
			state.connections[side] = {
				id: connectionId,
				send: (data: GameIterationResponse) => sendFn(sanitiseIteration(side, data)),
			};
			if (state.lastState) state.connections[side]?.send(state.lastState);
		},
		leave: (connectionId: string) => {
			if (state.connections.sideA?.id === connectionId) {
				state.connections.sideA = undefined;
				return { ok: true };
			}
			if (state.connections.sideB?.id === connectionId) {
				state.connections.sideB = undefined;
				return { ok: true };
			}
			return { ok: false };
		},
	};
};

type GameRoom = ReturnType<typeof createGameRoom>;

/** In-memory storage of all instances. */
const runningGameRooms: Record<string, GameRoom> = {};

export const gamePubSub = new Elysia().use(withUser).ws('/:id/pubsub', {
	async open(ws) {
		const user = ws.data.user;
		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;

		const game = await getGameById(Number(channel), user);
		if (!game) {
			ws.send({ error: 'Game not found' });
			return;
		}

		const sideToJoin =
			game.sideA === user.id ? 'sideA'
			: game.sideB === user.id ? 'sideB'
			: undefined;
		if (!sideToJoin) {
			ws.send({ error: 'Unauthorised' });
			return;
		}

		const ongoingGame = runningGameRooms[channel] ?? (runningGameRooms[channel] = createGameRoom());
		ongoingGame.join(sideToJoin, ws.id, ws.send);

		ws.subscribe(channel);
		console.log(
			`⚡ (${channel}) “${user.username ?? user.id}” is now`,
			chalk.green(`\uE0B6${chalk.bgGreen(`online`)}\uE0B4`),
		);
	},
	close(ws) {
		const user = ws.data.user;
		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;
		ws.unsubscribe(channel);
		const game = runningGameRooms[channel];
		if (!game) return;
		const left = game.leave(ws.id);
		if (left.ok) {
			console.log(
				`⚡ (${channel}) “${user.username ?? user.id}” is now`,
				chalk.red(`\uE0B6${chalk.bgRed(`offline`)}\uE0B4`),
			);
		}
	},
	async message(ws, message) {
		const user = ws.data.user;
		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;
		const game = await getGameById(Number(channel), user);
		const ongoingGame = runningGameRooms[channel];
		if (!game || !ongoingGame) {
			ws.send({ error: 'Game not found' });
			return;
		}

		const userSide =
			ongoingGame.state.connections.sideA?.id === ws.id ? 'sideA'
			: ongoingGame.state.connections.sideA?.id === ws.id ? 'sideB'
			: undefined;

		if (!userSide) {
			ws.send({ error: 'Unauthorised' });
			return;
		}

		const action = ongoingGame.state.lastState?.actions?.[userSide];
		if (!action) {
			ws.send({ error: 'Action not requested' });
			return;
		}

		try {
			validateAction(action, message, userSide);
			console.log(`⚡ (${channel}) “${user.username ?? user.id}”:`, message);
		} catch (error) {
			console.error(error);
			ws.send({ error: 'Invalid action' });
			return;
		}
	},
});

const CastFromHandMessageSchema = t.Object({
	type: t.Literal('cast_from_hand'),
	cardKey: t.Number(),
	stack: t.Union([t.Literal('blue'), t.Literal('green'), t.Literal('red')]),
});

export type CastFromHandMessageSchema = Static<typeof CastFromHandMessageSchema>;

const validateAction = (
	action: NonNullable<NonNullable<GameIterationResponse['actions']>[Side]>,
	message: unknown,
	side: Side,
) => {
	switch (action.type) {
		case 'cast_from_hand': {
			const payload = Value.Decode(CastFromHandMessageSchema, message);
			action.submit({ cardKey: payload.cardKey, stack: payload.stack, side });
			return;
		}
		default:
			throw new Error('Not implemented');
	}
};
