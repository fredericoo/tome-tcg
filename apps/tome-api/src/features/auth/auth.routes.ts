import { Value } from '@sinclair/typebox/value';
import { GitHub, OAuth2RequestError, generateState } from 'arctic';
import { eq } from 'drizzle-orm';
import { Elysia, error, t } from 'elysia';
import { generateId } from 'lucia';

import { db } from '../../db';
import { users } from '../../db/schema';
import { takeFirst } from '../../lib/utils';
import { lucia } from './auth';

const githubEnv = Value.Cast(
	t.Object({
		GITHUB_CLIENT_ID: t.String({ minLength: 1 }),
		GITHUB_CLIENT_SECRET: t.String({ minLength: 1 }),
	}),
	process.env,
);

const githubUserSchema = t.Object({
	id: t.Number(),
	login: t.String({ minLength: 1 }),
	avatar_url: t.Optional(t.String()),
});

const github = new GitHub(githubEnv.GITHUB_CLIENT_ID, githubEnv.GITHUB_CLIENT_SECRET);

export const authRoutes = new Elysia({ prefix: '/auth' })
	.error({ OAuth2RequestError })
	.onError(({ code, error, set }) => {
		if (code === 'OAuth2RequestError') {
			set.status = 400;
			return { ok: false, error: error.message };
		}
	})
	.get('/github', async ({ cookie: { github_oauth_state }, set }) => {
		const state = generateState();
		const url = await github.createAuthorizationURL(state);
		github_oauth_state?.set({
			value: state,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: 'lax',
		});
		set.redirect = url.toString();
	})
	.get(
		'/github/callback',
		async ({ query: { code, state }, cookie, set }) => {
			const storedState = cookie.github_oauth_state.value;
			if (!code || !state || !storedState || state !== storedState) {
				return error('Bad Request', 'Invalid state or code');
			}
			const tokens = await github.validateAuthorizationCode(code);
			const githubUserResponse = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${tokens.accessToken}`,
				},
			});
			const githubUser = await githubUserResponse.json().then(json => Value.Cast(githubUserSchema, json));

			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.githubId, githubUser.id))
				.limit(1)
				.then(takeFirst);

			if (existingUser) {
				const session = await lucia.createSession(existingUser.id, {});
				const sessionCookie = lucia.createSessionCookie(session.id);
				cookie[sessionCookie.name]?.set({ value: sessionCookie.value, ...sessionCookie.attributes });
				set.redirect = '/';
				return;
			}

			const userId = generateId(15);
			await db.insert(users).values({
				id: userId,
				githubId: githubUser.id,
				username: githubUser.login,
				avatarUrl: githubUser.avatar_url,
			});
			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookie[sessionCookie.name]?.set({ value: sessionCookie.value, ...sessionCookie.attributes });
			set.redirect = 'http://192.168.0.38:5173/';
			return;
		},
		{
			cookie: t.Object({
				github_oauth_state: t.String({ minLength: 1 }),
			}),
		},
	);
