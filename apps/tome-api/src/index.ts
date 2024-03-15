import chalk from 'chalk';
import { Elysia } from 'elysia';

import { UnauthorisedError } from './lib/error';

/** Used to allow breaking off the `for await` loop without stopping the iterator. */
function unclosed<T>(iterable: AsyncGenerator<T>) {
	return {
		[Symbol.asyncIterator]() {
			const iterator = iterable[Symbol.asyncIterator]();
			return {
				next: iterator.next.bind(iterator),
				return: async function () {
					return { type: 'return', value: null };
				},
				throw: async function () {
					return { type: 'throw', value: null };
				},
			};
		},
	};
}

async function* gameStub(stepFrom = 0): AsyncGenerator<{ state: 'idle' | 'ready' | 'playing'; step: number }> {
	let step = stepFrom;
	yield { state: 'idle', step };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield { state: 'ready', step };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield { state: 'playing', step };
	step++;
	await new Promise(resolve => setTimeout(resolve, 1000));
	yield* gameStub(step);
}

/** In-memory storage of all games ongoing. */
const ongoingGames: Record<string, { online: string[]; lastState: any; game: ReturnType<typeof gameStub> }> = {};

const app = new Elysia()
	.error({ UnauthorisedError })
	.ws('/game/:id', {
		async open(ws) {
			const channel = ws.data.params.id;
			console.log(`[open] Connection established to ${channel}`);
			ws.subscribe(channel);

			const ongoingGame =
				ongoingGames[channel] ??
				(ongoingGames[channel] = {
					online: [],
					lastState: undefined,
					game: gameStub(),
				});

			ongoingGame.online.push(ws.id);

			if (ongoingGame.lastState) {
				ws.send(ongoingGame.lastState);
			}

			console.log('connected', ongoingGame.online);
			for await (const state of unclosed(ongoingGame.game)) {
				ongoingGame.lastState = state;
				console.log('iterating', ongoingGame.online, state, ws.id);
				ws.send(state);
				ws.publish(channel, state);
				if (!ongoingGame.online.includes(ws.id)) {
					break;
				}
			}
		},
		close(ws) {
			const channel = ws.data.params.id;

			console.log(`[close] Connection closed to ${channel}`);

			ws.unsubscribe(channel);

			const state = ongoingGames[channel];
			if (state) {
				const userIndex = state.online.indexOf(ws.id);
				if (userIndex !== -1) {
					state.online.splice(userIndex, 1);
				}
				ws.publish(channel, { online: state.online });
			}
		},
		message(ws, message) {
			console.log('message', message);
		},
	})

	.listen(process.env.PORT ?? 8080);

console.log(
	chalk.green(`\uE0B6${chalk.bgGreen('Tome API')}\uE0B4`),
	`running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
