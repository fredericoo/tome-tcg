import { Link, Outlet } from '@remix-run/react';
import { LoaderFunction, useLoaderData } from 'react-router-typesafe';

import { UserAvatar } from '../components/user-avatar';
import { api } from '../lib/api';

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
				<Link to="/">
					<h1 className="text-lg font-bold tracking-tight">Tome (alpha)</h1>
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
