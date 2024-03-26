import { Elysia } from 'elysia';
import type { Session, User } from 'lucia';

import { lucia } from './auth';

/** Own implementation of `oslo`’s function of the same name.
 *  Changes:
 *  - We allow different ports in development mode
 *  - We allow the the allowed domain to be a subdomain of the origin
 */
export function verifyRequestOrigin(origin: string, allowedDomains: string[]) {
	if (!origin || allowedDomains.length === 0) return false;
	const originHost = safeURL(removePortIfLocalDev(origin))?.host ?? null;
	if (!originHost) return false;
	for (const domain of allowedDomains) {
		let host;
		if (domain.startsWith('http://') || domain.startsWith('https://')) {
			host = safeURL(removePortIfLocalDev(domain))?.host ?? null;
		} else {
			host = safeURL(removePortIfLocalDev('https://' + domain))?.host ?? null;
		}
		console.log('@@@@@@@@@@@@@@@@@@@@', host, originHost);
		if (host && host.includes(originHost)) return true;
	}
	return false;
}
function removePortIfLocalDev(host: string) {
	if (process.env.NODE_ENV !== 'development') return host;
	return host.replace(/:\d+$/, '');
}
function safeURL(url: string) {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

export const withUser = new Elysia({ name: 'with-user' }).resolve(
	{
		as: 'global',
	},
	async (
		context,
	): Promise<{
		user: User | null;
		session: Session | null;
	}> => {
		// CSRF check
		if (context.request.method !== 'GET') {
			const originHeader = context.request.headers.get('Origin');
			// NOTE: You may need to use `X-Forwarded-Host` instead
			const hostHeader = context.request.headers.get('Host');

			if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
				return {
					user: null,
					session: null,
				};
			}
		}

		// use headers instead of Cookie API to prevent type coercion
		const cookieHeader = context.request.headers.get('Cookie') ?? '';
		const sessionId = lucia.readSessionCookie(cookieHeader);
		if (!sessionId) {
			return {
				user: null,
				session: null,
			};
		}

		const { session, user } = await lucia.validateSession(sessionId);
		if (session && session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			context.cookie[sessionCookie.name]?.set({
				value: sessionCookie.value,
				...sessionCookie.attributes,
			});
		}
		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			context.cookie[sessionCookie.name]?.set({
				value: sessionCookie.value,
				...sessionCookie.attributes,
			});
		}
		return {
			user,
			session,
		};
	},
);
