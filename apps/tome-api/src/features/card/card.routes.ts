import { Elysia } from 'elysia';

import { cardDb } from './card.db';

export const cardRoutes = new Elysia({ prefix: '/cards' }).get('/', async ({ set }) => {
	// Client cache to 1 hour + 1 hour swr
	set.headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=3600';

	return cardDb;
});
