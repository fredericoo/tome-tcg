import { Link } from '@remix-run/react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { UserAvatar } from '../components/user-avatar';
import { api } from '../lib/api';

export const clientLoader = (async () => {
	return defer({
		games: api.me.games.get().then(res => {
			if (res.error) throw res.error;
			return res.data;
		}),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { games } = useLoaderData<typeof clientLoader>();

	return (
		<section className="flex flex-col gap-2">
			<header className="flex gap-4">
				<h1 className="flex-grow text-lg font-bold tracking-tight">Ongoing games</h1>
				<Link
					to="/games/new"
					className="flex flex-none items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-white"
				>
					<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z"
							fill="currentColor"
							fillRule="evenodd"
							clipRule="evenodd"
						></path>
					</svg>
					Create game
				</Link>
			</header>
			<Suspense fallback={<div>Loading games…</div>}>
				<Await resolve={games} errorElement={<GenericErrorBoundary />}>
					{games => (
						<ul className="flex flex-col gap-4">
							{games.map(game => (
								<li key={game.id}>
									<Link to={`/games/${game.id}`} className="flex gap-4 rounded-xl bg-neutral-100 p-4">
										<div className="flex flex-shrink flex-grow items-center gap-4">
											<span className="flex flex-1 flex-row-reverse items-center gap-2">
												<UserAvatar user={game.sideA} /> {game.sideA.username}
											</span>
											<span className="opacity-50">vs</span>
											<span className="flex flex-1 items-center gap-2 ">
												<UserAvatar user={game.sideB} /> {game.sideB.username}
											</span>
										</div>

										<div className="flex-none">{game.status}</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</Await>
			</Suspense>
		</section>
	);
}
