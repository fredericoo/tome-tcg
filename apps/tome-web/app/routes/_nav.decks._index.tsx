import { Link } from '@remix-run/react';
import { IconCards, IconCardsFilled, IconCirclePlus } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { Button } from '../components/button';
import { DeckColorCounts } from '../components/deck/deck-color-counts';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { SectionCard } from '../components/section-card';
import { api, getDataOrThrow } from '../lib/api';

export const clientLoader = (async () => {
	return defer({
		decks: api.me.decks.get().then(getDataOrThrow),
		cardData: await api.cards.index.get().then(getDataOrThrow),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { decks, cardData } = useLoaderData<typeof clientLoader>();

	return (
		<div className="py-4">
			<SectionCard.Root className="mx-auto max-w-lg">
				<SectionCard.Header>
					<SectionCard.TitleBar Icon={IconCards}>
						<div>
							<h1 className="heading-md">Decks</h1>
							<p className="text-neutral-11 text-sm">Build your 30-card overpowered combos here</p>
						</div>
					</SectionCard.TitleBar>
					<aside>
						<Button asChild>
							<Link to="/decks/new" prefetch="intent">
								<IconCirclePlus /> <span>Create</span>
							</Link>
						</Button>
					</aside>
				</SectionCard.Header>
				<SectionCard.Content>
					<Suspense fallback={<div>Loading…</div>}>
						<Await resolve={decks} errorElement={<GenericErrorBoundary />}>
							{decks => {
								if (decks.length === 0)
									return <p className="body-sm text-neutral-11 p-4 text-center">We’re ready for your first deck!</p>;
								return (
									<ul>
										{decks.map(deck => (
											<li
												key={deck.id}
												className="first-of-type:rounded-t-4 last-of-type:rounded-b-4 hover:bg-neutral-1 active:bg-neutral-2 [&:not(:last-of-type)]:border-b"
											>
												<Link
													prefetch="render"
													to={`/decks/${deck.id}`}
													className="fr ease-expo-out pointer-fine:hover:px-6 flex items-center gap-4 rounded-[inherit] p-4 transition-all duration-300"
												>
													<div className="flex flex-shrink flex-grow items-center gap-4 overflow-hidden">
														<IconCardsFilled /> <span className="truncate">{deck.name || 'Untitled deck'}</span>
													</div>

													<div className="flex-none">
														<DeckColorCounts className="text-accent-12" cardData={cardData} cardsList={deck.cards} />
													</div>
												</Link>
											</li>
										))}
									</ul>
								);
							}}
						</Await>
					</Suspense>
				</SectionCard.Content>
			</SectionCard.Root>
		</div>
	);
}
