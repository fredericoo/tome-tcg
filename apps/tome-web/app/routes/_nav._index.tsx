import { Link } from '@remix-run/react';
import { IconPlus, IconSparkles } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { Badge, BadgeProps } from '../components/badge';
import { Button } from '../components/button';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { Image } from '../components/image';
import { Guide } from '../components/onboarding/guide';
import { SectionCard } from '../components/section-card';
import { UserAvatar } from '../components/user-avatar';
import { api, getDataOrThrow } from '../lib/api';
import { useNavLoaderData } from '../lib/user.utils';

export const clientLoader = (async () => {
	return defer({
		games: api.me.games.get().then(getDataOrThrow),
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
		<div className="flex flex-col gap-4 py-4">
			<SectionCard.Root className="mx-auto max-w-lg">
				<SectionCard.Header>
					<SectionCard.TitleBar Icon={IconSparkles}>
						<div>
							<h1 className="heading-md pb-1">Ongoing duels</h1>
							<p className="text-neutral-11 text-sm">Build your 30-card overpowered combos here</p>
						</div>
					</SectionCard.TitleBar>

					<aside>
						<Button variant="ghost" asChild>
							<Link to="/games/new">
								<IconPlus /> <span>Invite</span>
							</Link>
						</Button>
					</aside>
				</SectionCard.Header>
				<SectionCard.Content>
					<Suspense fallback={<div>Loading games…</div>}>
						<Await resolve={games} errorElement={<GenericErrorBoundary />}>
							{games => {
								if (games.length === 0)
									return (
										<div className="p-8">
											<Image className="mx-auto max-w-xs" srcWidth="50vw" src="/duel.png" />
											<h2 className="heading-md text-center">You haven’t been invited to a duel yet</h2>
											<p className="body-sm text-neutral-11 text-center">
												Hold on tight or invite another player for a duel.
											</p>
										</div>
									);
								return (
									<ul className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col ring-1">
										{games.map(game => {
											const opponent = game.sideA.id === user.id ? game.sideB : game.sideA;
											return (
												<li
													key={game.id}
													className="first-of-type:rounded-t-4 last-of-type:rounded-b-4 hover:bg-neutral-1 active:bg-neutral-2 [&:not(:last-of-type)]:border-b"
												>
													<Link
														prefetch="render"
														to={`/games/${game.id}`}
														className="fr ease-expo-out pointer-fine:hover:px-6 flex items-center gap-4 rounded-[inherit] p-4 transition-all duration-300"
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
								);
							}}
						</Await>
					</Suspense>
				</SectionCard.Content>
			</SectionCard.Root>
			<Guide />
		</div>
	);
}
