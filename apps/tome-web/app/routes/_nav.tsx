import { Link, Outlet, ShouldRevalidateFunction } from '@remix-run/react';
import { LoaderFunction, useLoaderData } from 'react-router-typesafe';

import { UserAvatar } from '../components/user-avatar';
import { api } from '../lib/api';

export const shouldRevalidate = (({ formMethod, defaultShouldRevalidate }) => {
	if (formMethod !== 'POST') return false;
	return defaultShouldRevalidate;
}) satisfies ShouldRevalidateFunction;

export const clientLoader = (async () => {
	const { data, error } = await api.me.get();
	if (error) throw error;
	return { user: data };
}) satisfies LoaderFunction;

export default function Layout() {
	const { user } = useLoaderData<typeof clientLoader>();

	return (
		<main className="container mx-auto  max-w-screen-md">
			<nav className="flex border-b py-4">
				<div className="flex-1" />
				<Link to="/" className="fr flex items-center rounded-full px-2 transition-shadow">
					<h1 className="text-md font-bold tracking-tight">Tome (alpha)</h1>
				</Link>
				<div className="flex flex-1 items-center justify-end gap-2">
					<UserAvatar user={user} />
				</div>
			</nav>
			<div className="flex flex-col gap-8 py-4">
				<Outlet />
			</div>
		</main>
	);
}
