import { Link, ShouldRevalidateFunction } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { ActionFunction, LoaderFunction, defer, redirect, useLoaderData } from 'react-router-typesafe';

import { Button } from '../components/button';
import { CardDetailsOverlay } from '../components/card-details-overlay';
import { CardBuilderProvider } from '../components/deck/card-builder-store';
import { CardLibrary } from '../components/deck/card-library';
import { DeckFloatingMenu } from '../components/deck/deck-floating-menu';
import { DeckSettings } from '../components/deck/deck-settings';
import { api } from '../lib/api';
import { CardDataProvider } from '../lib/card-data';

export const shouldRevalidate = (({ formMethod }) => {
	return formMethod === 'POST';
}) satisfies ShouldRevalidateFunction;

export const clientLoader = (async () => {
	return defer({
		cardData: await api.cards.index.get().then(res => {
			if (res.error) throw res.error;
			return res.data;
		}),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { cardData } = useLoaderData<typeof clientLoader>();

	return (
		<CardDataProvider value={cardData}>
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
					<h1 className="heading-md flex-grow text-center">New deck</h1>
					<div className="flex-1" />
				</header>

				<DeckSettings />
				<CardBuilderProvider initialValue={{ cards: {} }}>
					<CardLibrary />
					<DeckFloatingMenu />
				</CardBuilderProvider>
			</div>

			<CardDetailsOverlay />
		</CardDataProvider>
	);
}

export const clientAction = (async ({ request }) => {
	const formData = await request.formData();
	const cardsString = formData.get('cards')?.toString().trim() ?? '';

	const { error } = await api.me.decks.post({
		name: formData.get('name')?.toString() ?? 'Unnamed deck',
		cards: cardsString.split(',').filter(Boolean),
	});

	if (!error) return redirect('/decks');

	return { error };
}) satisfies ActionFunction;
