import { Link } from '@remix-run/react';
import { IconCards, IconCirclePlus } from '@tabler/icons-react';
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
		<SectionCard.Root>
			<SectionCard.Header>
				<SectionCard.TitleBar Icon={IconCards}>
					<div>
						<h1 className="heading-md">Decks</h1>
						<p className="text-neutral-11 text-sm">Build your 30-card overpowered combos here</p>
					</div>
				</SectionCard.TitleBar>
				<aside>
					<Button asChild>
						<Link to="/decks/new">
							<IconCirclePlus /> <span>Create</span>
						</Link>
					</Button>
				</aside>
			</SectionCard.Header>
			<SectionCard.Content className="p-3">
				<Suspense fallback={<div>Loading…</div>}>
					<Await resolve={decks} errorElement={<GenericErrorBoundary />}>
						{decks => {
							if (decks.length === 0)
								return <p className="body-sm text-neutral-11 p-4 text-center">We’re ready for your first deck!</p>;
							return (
								<ul className="flex flex-col gap-2">
									{decks.map(deck => (
										<li key={deck.id}>
											<Link
												className="bg-neutral-1 hover:bg-accent-2 hover:text-accent-11 active:bg-accent-3 rounded-2 fr ease-expo-out block px-4 py-2 transition-all duration-100"
												to={`/decks/${deck.id}`}
											>
												<p className="heading-sm truncate">{deck.name || 'Untitled deck'}</p>
												<DeckColorCounts className="text-accent-12" cardData={cardData} cardsList={deck.cards} />
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
	);
}
