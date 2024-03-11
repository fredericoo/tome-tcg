import chalk from 'chalk';
import { Elysia } from 'elysia';

import { UnauthorisedError } from './lib/error';

const app = new Elysia().error({ UnauthorisedError }).listen(process.env.PORT ?? 8080);

console.log(
	chalk.green(`\uE0B6${chalk.bgGreen('Tome API')}\uE0B4`),
	`running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
