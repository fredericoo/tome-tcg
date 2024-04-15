import { Form, ShouldRevalidateFunction, useSearchParams, useSubmit } from '@remix-run/react';
import { IconCards, IconSettings } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { CardSlug } from '../../../tome-api/src/features/card/card.db';
import { COLORS } from '../../../tome-api/src/features/engine/engine.game';
import { Button } from '../components/button';
import { ContentSwitcher } from '../components/content-switcher';
import { Card } from '../components/game/card';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { Input } from '../components/input';
import { api } from '../lib/api';
import { CardDataProvider } from '../lib/card-data';

export const shouldRevalidate = (({ formMethod }) => {
	return formMethod === 'POST';
}) satisfies ShouldRevalidateFunction;

export const clientLoader = (async () => {
	return defer({
		cards: api.cards.index.get().then(res => {
			if (res.error) throw res.error;
			return res.data;
		}),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { cards } = useLoaderData<typeof clientLoader>();
	const [search] = useSearchParams();
	const filter = search.get('color');
	const searchByName = search.get('q');
	const submit = useSubmit();

	return (
		<div className="mx-auto flex w-full max-w-lg flex-col gap-4">
			<header className="flex gap-4">
				<h1 className="display-md flex-grow">Create deck</h1>
			</header>

			<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
				<header className="flex gap-2 p-2">
					<IconSettings /> <h1 className="heading-sm">Deck settings</h1>
				</header>
				<fieldset className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col gap-4 p-4 ring-1">
					<label htmlFor="name">
						<span className="label-sm">Name</span>
						<Input id="name" type="text" name="name" />
					</label>
				</fieldset>
			</section>

			<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 py-2">
				<header className="flex gap-2 p-2 px-4">
					<IconCards /> <h1 className="heading-sm">Card library</h1>
				</header>

				<Form
					className="flex flex-col gap-2 px-2"
					preventScrollReset
					onChange={e => submit(e.currentTarget, { preventScrollReset: true })}
				>
					<div className="self-center">
						<ContentSwitcher.Container name="color" defaultValue={filter ?? undefined}>
							<ContentSwitcher.Item value="">All</ContentSwitcher.Item>
							{COLORS.map(color => (
								<ContentSwitcher.Item value={color} key={color}>
									{color}
								</ContentSwitcher.Item>
							))}
						</ContentSwitcher.Container>
					</div>
					<Input type="text" name="q" autoComplete="off" placeholder="Search" />
				</Form>

				<Suspense fallback={null}>
					<Await resolve={cards} errorElement={<GenericErrorBoundary />}>
						{cards => {
							const cardList = Object.keys(cards) as CardSlug[];
							const cardsToDisplay = cardList
								.filter(id => {
									const card = cards[id];
									return (
										!filter ||
										(card.type === 'field' && card.color === filter) ||
										(card.type === 'spell' && card.colors.includes(filter))
									);
								})
								.filter(id => {
									const card = cards[id];
									return !searchByName || card.name.toLowerCase().includes(searchByName.toLowerCase());
								});

							return (
								<>
									<ul key={filter} className="flex gap-4 overflow-x-auto p-4">
										<CardDataProvider value={cards}>
											{cardsToDisplay.map((id, i) => {
												return (
													<li className="flex items-center justify-center" key={id}>
														<Card size="lg" pubsubCard={{ id, key: i }} face="front" />
													</li>
												);
											})}
										</CardDataProvider>
									</ul>
									<p className="body-xs text-neutral-11 text-center">Showing {cardsToDisplay.length} cards</p>
								</>
							);
						}}
					</Await>
				</Suspense>
			</section>
			<div className="flex flex-col p-2">
				<Button type="submit">Create</Button>
			</div>
		</div>
	);
}
