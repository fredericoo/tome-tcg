import { Link } from '@remix-run/react';
import { IconPlus } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { Badge, BadgeProps } from '../components/badge';
import { Button } from '../components/button';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { UserAvatar } from '../components/user-avatar';
import { api } from '../lib/api';
import { useNavLoaderData } from '../lib/user.utils';

export const clientLoader = (async () => {
	return defer({
		games: api.me.games.get().then(res => {
			if (res.error) throw res.error;
			return res.data;
		}),
	});
}) satisfies LoaderFunction;

type GameStatus = NonNullable<Awaited<ReturnType<typeof api.me.games.get>>['data']>[number]['status'];
const gameStatusBadgeProps: Record<GameStatus, BadgeProps> = {
	CREATED: { colorScheme: 'warning', variant: 'default', children: 'Invited' },
	FINISHED: { colorScheme: 'outline', variant: 'default', children: 'Finished' },
	PLAYING: { colorScheme: 'positive', variant: 'default', children: 'Playing' },
};

export default function Page() {
	const { games } = useLoaderData<typeof clientLoader>();
	const { user } = useNavLoaderData();

	return (
		<section className="bg-neutral-2 rounded-6 mx-auto flex max-w-md flex-col gap-2 p-2">
			<header className="flex gap-4 p-2">
				<div className="flex-grow pl-3">
					<h1 className="heading-md pb-1">Ongoing games</h1>
					<p className="body-sm text-neutral-10">Games currently being played, or that you’ve been invited to join</p>
				</div>
				<div className="flex items-center">
					<Button variant="ghost" asChild>
						<Link to="/games/new">
							<IconPlus /> <span>Invite</span>
						</Link>
					</Button>
				</div>
			</header>
			<Suspense fallback={<div>Loading games…</div>}>
				<Await resolve={games} errorElement={<GenericErrorBoundary />}>
					{games => (
						<ul className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col ring-1">
							{games.map(game => {
								const opponent = game.sideA.id === user.id ? game.sideB : game.sideA;
								return (
									<li
										key={game.id}
										className="first-of-type:rounded-t-4 last-of-type:rounded-b-4 hover:bg-neutral-1 active:bg-neutral-2 [&:not(:last-of-type)]:border-b"
									>
										<Link
											to={`/games/${game.id}`}
											className="fr ease-expo-out flex items-center gap-4 rounded-[inherit] p-4 transition-all duration-300 hover:px-6"
										>
											<div className="flex flex-shrink flex-grow items-center gap-4 overflow-hidden">
												<UserAvatar user={opponent} /> <span className="truncate">{opponent.username}</span>
											</div>

											<div className="flex-none">
												<Badge {...gameStatusBadgeProps[game.status]} />
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</Await>
			</Suspense>
		</section>
	);
}
