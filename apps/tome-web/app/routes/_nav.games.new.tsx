import { Form, useSubmit } from '@remix-run/react';
import { ComponentPropsWithoutRef } from 'react';
import { ActionFunction, LoaderFunction, defer, redirect, useActionData, useLoaderData } from 'react-router-typesafe';
import { SWR } from 'swr-loader/react';

import { Button } from '../components/button';
import { Input } from '../components/input';
import { UserAvatar } from '../components/user-avatar';
import { api } from '../lib/api';
import { swr } from '../lib/cache';

export const clientLoader = (async ({ request }) => {
	const { searchParams } = new URL(request.url);
	const q = searchParams.get('q') ?? '';

	return defer({
		users: await swr({
			cacheKey: ['users', q],
			maxAge: 1000 * 60 * 60,
			onError: 'serve-stale',
			fetchFn: () =>
				api.users.get({ query: { q } }).then(res => {
					if (res.error) throw res.error;
					return res.data;
				}),
		}),
	});
}) satisfies LoaderFunction;

export const clientAction = (async ({ request }) => {
	const formData = await request.formData();
	const opponentId = formData.get('opponent_id')?.toString();
	if (!opponentId) return { ok: false, error: 'Opponent is required' } as const;

	const { error } = await api.games.index.post({ opponentId });
	if (error) return { ok: false, error: error.value } as const;

	return redirect('/');
}) satisfies ActionFunction;

const gameConfigs = ['castTimeoutMs', 'phaseDelayMs', 'startingCards', 'spellTimeoutMs'] as const;

const gameConfigProps: Record<(typeof gameConfigs)[number], ComponentPropsWithoutRef<'input'> & { label: string }> = {
	castTimeoutMs: { label: 'Cast timeout (ms)', type: 'number', defaultValue: 60000 },
	phaseDelayMs: { label: 'Phase delay (ms)', type: 'number', defaultValue: 1000 },
	startingCards: { label: 'Starting cards in hand', type: 'number', defaultValue: 2 },
	spellTimeoutMs: { label: 'Spell timeout (ms)', type: 'number', defaultValue: 60000 },
};

export default function Page() {
	const { users } = useLoaderData<typeof clientLoader>();
	const submit = useSubmit();
	const actionData = useActionData<typeof clientAction>();

	return (
		<section className="flex flex-col gap-2">
			<header className="flex gap-4">
				<h1 className="flex-grow text-lg font-bold tracking-tight">New game</h1>
			</header>
			<div>Opponent</div>

			<Form method="GET" onChange={e => submit(e.currentTarget)}>
				<input name="q" className="rounded-lg border border-neutral-400 px-4 py-2" placeholder="Type to search" />
			</Form>

			<Form method="POST" className="flex flex-col gap-4">
				<SWR data={users} errorElement={'Whoops'} loadingElement={'Loading users…'}>
					{users => (
						<ul className="flex flex-col gap-4">
							{users?.data.map(user => {
								const id = `opponent-${user.id}`;
								return (
									<li key={user.id}>
										<label htmlFor={id} className="flex items-center gap-2">
											<input id={id} type="radio" name="opponent_id" value={user.id} />
											<UserAvatar user={user} />
											<span>{user.username}</span>
										</label>
									</li>
								);
							})}
						</ul>
					)}
				</SWR>

				{gameConfigs.map(config => {
					const { label, ...props } = gameConfigProps[config];
					return (
						<label key={config}>
							{label}
							<Input type="number" name={config} {...props} />
						</label>
					);
				})}

				<Button type="submit">Create</Button>
			</Form>
			{actionData?.ok === false && <div role="alert">{actionData.error}</div>}
		</section>
	);
}
