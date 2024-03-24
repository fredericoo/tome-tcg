import { cors } from '@elysiajs/cors';
import chalk from 'chalk';
import { Elysia } from 'elysia';

import { UnauthorisedError } from './features/auth/auth.errors';
import { authRoutes } from './features/auth/auth.routes';
import { gameRoutes } from './features/game/game.routes';

const app = new Elysia()
	.error({ UnauthorisedError })
	.use(cors({ origin: ['localhost:5173', '192.168.0.38:5173'], credentials: true, allowedHeaders: ['Content-Type'] }))
	.use(authRoutes)
	.use(gameRoutes)

	.listen({ port: process.env.PORT ?? 8080 });

console.log(
	chalk.blue(`\uE0B6${chalk.bgBlue('Tome API')}\uE0B4`),
	`running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
