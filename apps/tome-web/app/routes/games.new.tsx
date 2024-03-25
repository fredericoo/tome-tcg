import { Form, useSubmit } from '@remix-run/react';
import { ActionFunction, LoaderFunction, defer, redirect, useActionData, useLoaderData } from 'react-router-typesafe';
import { SWR } from 'swr-loader/react';

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

export default function Page() {
	const { users } = useLoaderData<typeof clientLoader>();
	const submit = useSubmit();
	const actionData = useActionData<typeof clientAction>();

	return (
		<div className="container mx-auto flex max-w-screen-md flex-col gap-8 py-4">
			<h1 className="text-3xl font-bold tracking-tighter">Tome (alpha)</h1>

			<section className="flex flex-col gap-2">
				<header className="flex gap-4">
					<h1 className="flex-grow text-lg font-bold tracking-tight">New game</h1>
				</header>
				<div>Opponent</div>

				<Form method="GET" onChange={e => submit(e.currentTarget)}>
					<input name="q" className="rounded-lg border border-neutral-400 px-4 py-2" placeholder="Type to search" />
				</Form>

				<Form method="POST">
					<SWR data={users} errorElement={'Whoops'} loadingElement={'Loading users…'}>
						{users => (
							<ul>
								{users?.data.map(user => (
									<li key={user.id}>
										<button name="opponent_id" value={user.id}>
											{user.username}
										</button>
									</li>
								))}
							</ul>
						)}
					</SWR>
				</Form>
				{actionData?.ok === false && <div role="alert">{actionData.error}</div>}
			</section>
		</div>
	);
}
