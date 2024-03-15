import { edenFetch, edenTreaty } from '@elysiajs/eden';

import type { App } from '../../../tome-api/src/index';

export const fetchFromClient = edenFetch<App>('http://localhost:8080');

export const eden = edenTreaty<App>('http://localhost:8080', { $fetch: {} });
