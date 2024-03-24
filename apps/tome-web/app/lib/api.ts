import { edenFetch, treaty } from '@elysiajs/eden';

import type { App } from '../../../tome-api/src/index';

export const fetchFromClient = edenFetch<App>('http://192.168.0.38:8080');

export const api = treaty<App>('http://192.168.0.38:8080', { fetch: { credentials: 'include' } });
