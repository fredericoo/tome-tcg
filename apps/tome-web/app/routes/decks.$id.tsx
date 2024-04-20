import { Await, Link } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Suspense } from 'react';
import { ActionFunction, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { invariant } from '../../../tome-api/src/lib/utils';
import { Button } from '../components/button';
import { CardBuilderProvider, cardsListToMap } from '../components/deck/card-builder-store';
import { CardLibrary } from '../components/deck/card-library';
import { DeckFloatingMenu } from '../components/deck/deck-floating-menu';
import { DeckSettings } from '../components/deck/deck-settings';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { api, getDataOrThrow } from '../lib/api';
import { CardDataProvider } from '../lib/card-data';

export const clientLoader = (async ({ params }) => {
	invariant(typeof params.id === 'string', 'Deck ID must be a string');

	return defer({
		deck: api.decks({ deckId: params.id }).get().then(getDataOrThrow),
		cardData: api.cards.index.get().then(getDataOrThrow),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { cardData, deck } = useLoaderData<typeof clientLoader>();

	return (
		<div className="mx-auto flex w-full max-w-screen-lg flex-col gap-4 py-4">
			<header className="flex items-center gap-2">
				<div className="flex flex-1 justify-start">
					<Button asChild variant="ghost" size="sm">
						<Link to="/decks">
							<IconArrowLeft />
							<span>Back</span>
						</Link>
					</Button>
				</div>
				<h1 className="heading-md flex-grow text-center">Editing deck</h1>
				<div className="flex-1" />
			</header>
			<Suspense fallback={<div>Loading...</div>}>
				<Await resolve={deck} errorElement={<GenericErrorBoundary />}>
					{deck => {
						const cardsMap = cardsListToMap(deck.cards);
						return (
							<>
								<DeckSettings defaultValues={{ name: deck.name }} />
								<Await resolve={cardData} errorElement={<GenericErrorBoundary />}>
									{cardData => (
										<CardBuilderProvider initialValue={{ cards: cardsMap }}>
											<CardDataProvider value={cardData}>
												<CardLibrary />
												<DeckFloatingMenu />
											</CardDataProvider>
										</CardBuilderProvider>
									)}
								</Await>
							</>
						);
					}}
				</Await>
			</Suspense>
		</div>
	);
}

export const clientAction = (async ({ request, params }) => {
	const deckId = params.id;
	if (typeof deckId !== 'string') return { error: 'Invalid deck ID' };
	const formData = await request.formData();
	const cardsString = formData.get('cards')?.toString().trim() ?? '';

	const { error } = await api.decks({ deckId }).post({
		name: formData.get('name')?.toString(),
		cards: cardsString.split(',').filter(Boolean),
	});

	return { error };
}) satisfies ActionFunction;
