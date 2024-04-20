import { cors } from '@elysiajs/cors';
import chalk from 'chalk';
import { Elysia } from 'elysia';
import { match } from 'ts-pattern';

import { UnauthorisedError } from './features/auth/auth.errors';
import { authRoutes } from './features/auth/auth.routes';
import { cardRoutes } from './features/card/card.routes';
import { deckRoutes } from './features/deck/deck.routes';
import { gameRoutes } from './features/game/game.routes';
import { userRoutes } from './features/user/user.routes';

const app = new Elysia()
	.error({ UnauthorisedError })
	.use(
		cors({
			origin: match(process.env.NODE_ENV)
				.with('development', () => ['localhost:5173', 'localhost:4173', '192.168.0.38:5173'])
				.with('production', () => [process.env.ALLOWED_ORIGIN].filter(Boolean))
				.otherwise(() => []),
			credentials: true,
			methods: ['GET', 'POST', 'PATCH', 'DELETE'],
			allowedHeaders: ['Content-Type'],
		}),
	)
	.use(userRoutes)
	.use(authRoutes)
	.use(gameRoutes)
	.use(cardRoutes)
	.use(deckRoutes)

	.listen({ port: process.env.PORT ?? 8080 });

console.log(
	chalk.blue(`\uE0B6${chalk.bgBlue('Tome API')}\uE0B4`),
	`running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
