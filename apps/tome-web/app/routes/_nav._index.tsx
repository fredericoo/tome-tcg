import { Link } from '@remix-run/react';
import { IconPlus } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { Button } from '../components/button';
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
				<Button variant="outline" asChild>
					<Link to="/games/new">
						<IconPlus /> <span>Create game</span>
					</Link>
				</Button>
			</header>
			<Suspense fallback={<div>Loading games…</div>}>
				<Await resolve={games} errorElement={<GenericErrorBoundary />}>
					{games => (
						<ul className="flex flex-col gap-4">
							{games.map(game => (
								<li key={game.id}>
									<Link to={`/games/${game.id}`} className="fr flex gap-4 rounded-xl bg-neutral-100 p-4 transition-all">
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
