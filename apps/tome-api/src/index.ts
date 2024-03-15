import chalk from 'chalk';
import { Elysia, t } from 'elysia';

import { UnauthorisedError } from './lib/error';

async function* gameStub({ publish, send }: { send: (data: any) => void; publish: (data: any) => void }) {
	yield { state: 'idle' as const };

	// wait for 5 seconds
	await new Promise(resolve => setTimeout(resolve, 5000));
	send({ state: 'you', message: 'just for the user that subscribed, probably a bad idea' });
	await new Promise(resolve => setTimeout(resolve, 5000));
	publish({ state: 'everyone', message: 'for everyone in the game' });
}
/** In-memory storage of all games ongoing. */
const ongoingGames: Record<string, { online: string[]; game: ReturnType<typeof gameStub> }> = {};

const app = new Elysia()
	.error({ UnauthorisedError })
	.guard({ cookie: t.Object({ token: t.String() }) }, app =>
		app
			.resolve(({ cookie }) => {
				return { userId: cookie.token.get() };
			})
			.ws('/game/:id', {
				open(ws) {
					const channel = ws.data.params.id;
					console.log(`[open] Connection established to ${channel}`);
					ws.subscribe(channel);

					const state =
						ongoingGames[channel] ??
						(ongoingGames[channel] = {
							online: [],
							game: gameStub({ send: ws.send, publish: data => ws.publish(channel, data) }),
						});
					if (!state.online.includes(ws.data.userId)) {
						state.online.push(ws.data.userId);
					}

					// send it to joining user so they know the current state.
					ws.send(state);
					// publish that a new user has joined.
					ws.publish(channel, { online: state.online });
				},
				close(ws) {
					const channel = ws.data.params.id;

					console.log(`[close] Connection closed to ${channel}`);

					ws.unsubscribe(channel);

					const state = ongoingGames[channel];
					if (state) {
						const userIndex = state.online.indexOf(ws.data.userId);
						if (userIndex !== -1) {
							state.online.splice(userIndex, 1);
						}
						ws.publish(channel, { online: state.online });
					}
				},
			}),
	)
	.listen(process.env.PORT ?? 8080);

console.log(
	chalk.green(`\uE0B6${chalk.bgGreen('Tome API')}\uE0B4`),
	`running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
