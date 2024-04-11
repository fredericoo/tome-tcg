import { Elysia } from 'elysia';

import { cardDb } from './card.db';

export const cardRoutes = new Elysia({ prefix: '/cards' }).get('/', async () => cardDb);
