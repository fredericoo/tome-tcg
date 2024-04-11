import { IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';
import { SWR } from 'swr-loader/react';

import { CardSlug } from '../../../tome-api/src/features/card/card.db';
import { COLORS, SpellColor } from '../../../tome-api/src/features/engine/engine.game';
import { Button } from '../components/button';
import { Card } from '../components/game/card';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { Input } from '../components/input';
import { api } from '../lib/api';
import { swr } from '../lib/cache';
import { CardDataProvider } from '../lib/card-data';

export const clientLoader = (async () => {
	return defer({
		cards: await swr({
			cacheKey: ['all-cards'],
			maxAge: 1000 * 60 * 60 * 24,
			onError: 'serve-stale',
			fetchFn: () =>
				api.cards.index.get().then(res => {
					if (res.error) throw res.error;
					return res.data;
				}),
		}),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { cards } = useLoaderData<typeof clientLoader>();
	const [filter, setFilter] = useState<SpellColor>();

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

			<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
				<header className="flex gap-2 p-2">
					<IconSettings /> <h1 className="heading-sm">Card library</h1>
				</header>
				{COLORS.map(color => (
					<label htmlFor={`color-${color}`} key={color}>
						<input
							onChange={() => {
								setFilter(color);
							}}
							id={`color-${color}`}
							type="radio"
							name="color"
							value={color}
						/>
						{color}
					</label>
				))}

				<SWR data={cards} errorElement={<GenericErrorBoundary />} loadingElement={<div>loading…</div>}>
					{res => {
						if (!res?.data) throw new Error('No data stored locally and failed to load.');
						const cardList = Object.keys(res.data) as CardSlug[];
						const cardsToDisplay = cardList.filter(id => {
							const card = res.data[id];
							return (
								!filter ||
								(card.type === 'field' && card.color === filter) ||
								(card.type === 'spell' && card.colors.includes(filter))
							);
						});

						return (
							<>
								<p>Showing {cardsToDisplay.length} cards</p>
								<ul className="grid grid-cols-2 gap-4 ">
									<CardDataProvider value={res.data}>
										{cardList.map((id, i) => {
											return (
												<li className="flex items-center justify-center [perspective:1000px]" key={id}>
													<Card
														size="lg"
														pubsubCard={{ id, key: i }}
														face={cardsToDisplay.includes(id) ? 'front' : 'back'}
													/>
												</li>
											);
										})}
									</CardDataProvider>
								</ul>
							</>
						);
					}}
				</SWR>
			</section>
			<div className="flex flex-col p-2">
				<Button type="submit">Create</Button>
			</div>
		</div>
	);
}
