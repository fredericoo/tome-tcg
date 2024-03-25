import { edenFetch, treaty } from '@elysiajs/eden';

import type { App } from '../../../tome-api/src/index';

export const fetchFromClient = edenFetch<App>(import.meta.env.VITE_API_URL);

export const api = treaty<App>(import.meta.env.VITE_API_URL, { fetch: { credentials: 'include' } });
