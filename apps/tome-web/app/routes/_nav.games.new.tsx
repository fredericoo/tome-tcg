import { Form, useSubmit } from '@remix-run/react';
import { IconSettings, IconUser } from '@tabler/icons-react';
import { ComponentPropsWithoutRef } from 'react';
import { ActionFunction, LoaderFunction, defer, redirect, useActionData, useLoaderData } from 'react-router-typesafe';
import { SWR } from 'swr-loader/react';

import { Button } from '../components/button';
import { Input } from '../components/input';
import { UserAvatar } from '../components/user-avatar';
import { api, getDataOrThrow } from '../lib/api';
import { swr } from '../lib/cache';

export const clientLoader = (async ({ request }) => {
	const { searchParams } = new URL(request.url);
	const q = searchParams.get('q') ?? '';

	return defer({
		users: await swr({
			cacheKey: ['users', q],
			maxAge: 1000 * 60 * 60,
			onError: 'serve-stale',
			fetchFn: () => api.users.get({ query: { q } }).then(getDataOrThrow),
		}),
	});
}) satisfies LoaderFunction;

export const clientAction = (async ({ request }) => {
	const formData = await request.formData();
	const { error } = await api.games.index.post(Object.fromEntries(formData.entries()) as any);
	if (error) return { ok: false, error: JSON.stringify(error.value) } as const;

	return redirect('/');
}) satisfies ActionFunction;

const gameConfigs = ['castTimeoutMs', 'phaseDelayMs', 'startingCards', 'spellTimeoutMs'] as const;

const gameConfigProps: Record<(typeof gameConfigs)[number], ComponentPropsWithoutRef<'input'> & { label: string }> = {
	castTimeoutMs: { label: 'Cast timeout (ms)', type: 'number', defaultValue: 60000 },
	phaseDelayMs: { label: 'Phase delay (ms)', type: 'number', defaultValue: 1000 },
	startingCards: { label: 'Starting cards in hand', type: 'number', min: 0, max: 30, defaultValue: 2 },
	spellTimeoutMs: { label: 'Spell timeout (ms)', type: 'number', defaultValue: 60000 },
};

export default function Page() {
	const { users } = useLoaderData<typeof clientLoader>();
	const submit = useSubmit();
	const actionData = useActionData<typeof clientAction>();

	return (
		<div className="mx-auto flex w-full max-w-lg flex-col gap-4">
			<header className="flex gap-4">
				<h1 className="display-md flex-grow">Create game</h1>
			</header>
			<Form id="search" method="GET" />
			<Form method="POST" className="flex flex-col gap-4">
				<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
					<header className="flex gap-2 p-2">
						<IconUser /> <h1 className="heading-sm">Opponent</h1>
					</header>
					<div className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex max-h-64 flex-col overflow-auto ring-1">
						<div className="bg-lowest/90 sticky top-0 z-10 border-b p-2 backdrop-blur-md backdrop-saturate-150">
							<Input onChange={e => submit(e.currentTarget.form)} form="search" name="q" placeholder="Type to search" />
						</div>

						<SWR data={users} errorElement={'Whoops'} loadingElement={'Loading users…'}>
							{users => (
								<ul className="flex flex-col gap-4 p-4 ">
									{users?.data.map(user => {
										const id = `opponent-${user.id}`;
										return (
											<li key={user.id}>
												<label htmlFor={id} className="flex items-center gap-2">
													<input id={id} type="radio" name="opponentId" value={user.id} />
													<UserAvatar user={user} />
													<span>{user.username}</span>
												</label>
											</li>
										);
									})}
								</ul>
							)}
						</SWR>
					</div>
				</section>

				<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
					<header className="flex gap-2 p-2">
						<IconSettings /> <h1 className="heading-sm">Game settings</h1>
					</header>
					<fieldset className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col gap-4 p-4 ring-1">
						{gameConfigs.map(config => {
							const { label, ...props } = gameConfigProps[config];
							return (
								<label key={config}>
									<span className="label-sm">{label}</span>
									<Input type="number" name={config} {...props} />
								</label>
							);
						})}

						<Button type="submit">Create</Button>
					</fieldset>
				</section>

				{actionData?.ok === false && <div role="alert">{actionData.error}</div>}
			</Form>
		</div>
	);
}
