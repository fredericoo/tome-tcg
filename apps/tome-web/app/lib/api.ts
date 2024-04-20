import { edenFetch, treaty } from '@elysiajs/eden';

import type { App } from '../../../tome-api/src/index';

export const fetchFromApi = edenFetch<App>(import.meta.env.VITE_API_URL);

export const api = treaty<App>(import.meta.env.VITE_API_URL, { fetch: { credentials: 'include' } });

export const getDataOrThrow = <T>(res: { data: T; error?: unknown }) => {
	if (res.error) throw res.error;
	if (!res.data) throw new Error('No data returned');
	return res.data;
};
