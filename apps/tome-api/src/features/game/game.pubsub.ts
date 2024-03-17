import chalk from 'chalk';
import { Elysia, t } from 'elysia';

import { SIDES, Side } from '../engine/engine.game';

async function* gameStub(
	stepFrom = 0,
): AsyncGenerator<{ state: 'idle' | 'ready' | 'playing'; step: number; action?: string }> {
	let step = stepFrom;
	yield { state: 'idle', step };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield { state: 'ready', step, action: 'message' };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield { state: 'playing', step };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield* gameStub(step);
}

type GameInstanceState = {
	connections: {
		sideA: { id: string; send: (data: any) => void } | undefined;
		sideB: { id: string; send: (data: any) => void } | undefined;
	};
	lastState: any;
	submitFn: () => void;
};

const sanitiseIteration = (side: Side, iteration: any) => {
	return { side, iteration };
};

const createGameInstance = () => {
	const game = gameStub();
	const state: GameInstanceState = {
		connections: { sideA: undefined, sideB: undefined },
		lastState: undefined,
		submitFn: () => {},
	};

	const handleGame = async () => {
		for await (const iteration of game) {
			state.lastState = iteration;
			SIDES.forEach(side => state.connections[side]?.send(iteration));
			if (iteration.action) {
				await new Promise(resolve => {
					state.submitFn = () => {
						resolve(null);
					};
				});
			}
		}
	};
	handleGame();

	return {
		state,
		join: (side: Side, connectionId: string, sendFn: (data: any) => void) => {
			state.connections[side] = { id: connectionId, send: (data: any) => sendFn(sanitiseIteration(side, data)) };
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

type GameInstance = ReturnType<typeof createGameInstance>;

/** In-memory storage of all instances. */
const runningGameInstances: Record<string, GameInstance> = {};

export const gamePubSub = new Elysia().ws('/:id/pubsub', {
	query: t.Object({ user: t.String() }),
	async open(ws) {
		// temporary mocks
		const userId = ws.data.query.user;
		// call the db, find out which users are in each side of the game
		const userIdToSide: Record<string, Side> = {
			a: 'sideA',
			b: 'sideB',
		};
		// get the user’s intended side
		const sideToJoin = userIdToSide[userId];

		if (!sideToJoin) {
			ws.send({ error: 'Unauthorised' });
			return;
		}

		const channel = ws.data.params.id;
		const ongoingGame = runningGameInstances[channel] ?? (runningGameInstances[channel] = createGameInstance());
		ongoingGame.join(sideToJoin, ws.id, ws.send);

		ws.subscribe(channel);
		console.log(`⚡ (${channel}) “${userId}” is now`, chalk.green(`\uE0B6${chalk.bgGreen(`online`)}\uE0B4`));
	},
	close(ws) {
		const userId = ws.data.query.user;
		const channel = ws.data.params.id;
		ws.unsubscribe(channel);
		const game = runningGameInstances[channel];
		if (!game) return;
		const left = game.leave(ws.id);
		if (left.ok) {
			console.log(`⚡ (${channel}) “${userId}” is now`, chalk.red(`\uE0B6${chalk.bgRed(`offline`)}\uE0B4`));
		}
	},
	message(ws, message) {
		const userId = ws.data.query.user;
		const channel = ws.data.params.id;
		const ongoingGame = runningGameInstances[channel];
		if (!ongoingGame) return;
		ongoingGame.state.submitFn();
		console.log(`👾 (${channel}) ${userId}:`, message);
	},
});
