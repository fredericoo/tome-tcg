import { Link } from '@remix-run/react';
import { Suspense } from 'react';
import { Await, LoaderFunction, defer, useLoaderData } from 'react-router-typesafe';

import { Button } from '../components/button';
import { GenericErrorBoundary } from '../components/generic-error-boundary';
import { api } from '../lib/api';

export const clientLoader = (async () => {
	return defer({
		decks: api.me.decks.get().then(res => {
			if (res.error) throw res.error;
			return res.data;
		}),
	});
}) satisfies LoaderFunction;

export default function Page() {
	const { decks } = useLoaderData<typeof clientLoader>();

	return (
		<section className="py-4">
			<h1 className="heading-md text-center">Decks</h1>

			<div>
				<Suspense fallback={<div>Loading…</div>}>
					<Await resolve={decks} errorElement={<GenericErrorBoundary />}>
						{decks => {
							if (decks.length === 0)
								return <p className="body-sm text-neutral-11 p-4 text-center">We’re ready for your first deck!</p>;
							return (
								<ul>
									{decks.map(deck => (
										<li key={deck.id}>{deck.name}</li>
									))}
								</ul>
							);
						}}
					</Await>
				</Suspense>

				<Button asChild>
					<Link to="/decks/new">Create deck</Link>
				</Button>
			</div>
		</section>
	);
}
