import { Link, NavLink, Outlet, ShouldRevalidateFunction } from '@remix-run/react';
import { IconBook, IconBookFilled, IconPlus } from '@tabler/icons-react';
import { LoaderFunction, useLoaderData } from 'react-router-typesafe';

import { Tabbar } from '../components/tabbar';
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

export type NavLoader = typeof clientLoader;

export default function Layout() {
	const { user } = useLoaderData<typeof clientLoader>();

	return (
		<>
			<main className="container">
				<nav className="flex border-b py-4">
					<div className="flex-1" />
					<Link to="/" className="fr flex items-center rounded-full px-2 transition-shadow">
						<h1 className="label-md">Tome (alpha)</h1>
					</Link>
					<div className="flex flex-1 items-center justify-end gap-2"></div>
				</nav>
				<div className="flex flex-col gap-8 py-4 pb-24">
					<Outlet />
				</div>
			</main>
			<div className="fixed bottom-2 z-50 flex w-full justify-center px-2">
				<Tabbar.Container>
					<NavLink className="flex flex-1" to="/">
						{({ isActive }) => {
							return (
								<Tabbar.Item isActive={isActive} icon={{ inactive: <IconBook />, active: <IconBookFilled /> }}>
									Games
								</Tabbar.Item>
							);
						}}
					</NavLink>

					<div className="flex -translate-y-1/3 items-center">
						<NavLink
							className="bg-accent-9 fr hover:bg-accent-10 active:bg-accent-11 shadow-surface-md surface-accent ease-expo-out aspect-square flex-1 rounded-full px-4 py-2 text-white transition-all aria-[current=page]:scale-75 aria-[current=page]:opacity-0 "
							to="/games/new"
						>
							<div className="flex flex-col items-center gap-0.5">
								<IconPlus className="label-lg" />
								<span className="label-xs">Invite</span>
							</div>
						</NavLink>
					</div>

					<NavLink className="flex flex-1" to="/me">
						{({ isActive }) => {
							return (
								<Tabbar.Item
									isActive={isActive}
									icon={{
										inactive: <UserAvatar size="xs" user={user} />,
										active: <UserAvatar size="xs" user={user} />,
									}}
								>
									Me
								</Tabbar.Item>
							);
						}}
					</NavLink>
				</Tabbar.Container>
			</div>
		</>
	);
}
