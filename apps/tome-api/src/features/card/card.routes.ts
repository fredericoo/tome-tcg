import { Elysia } from 'elysia';

import { cardDb } from './card.db';

export const cardRoutes = new Elysia({ prefix: '/cards' }).get('/', async set => {
	// CDN cache to 24 hours + 1 hour swr
	set.headers.cacheControl = 'public, max-age=86400, stale-while-revalidate=3600';
	return cardDb;
});
