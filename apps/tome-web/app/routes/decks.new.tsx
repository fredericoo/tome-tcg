import { Form, Link, ShouldRevalidateFunction, useSearchParams, useSubmit } from '@remix-run/react';
import {
	IconArrowLeft,
	IconCards,
	IconExclamationCircle,
	IconMinus,
	IconPlus,
	IconSettings,
	IconX,
} from '@tabler/icons-react';
import { MotionValue, motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ActionFunction, LoaderFunction, defer, redirect, useActionData, useLoaderData } from 'react-router-typesafe';

import { CardSlug } from '../../../tome-api/src/features/card/card.db';
import { COLORS } from '../../../tome-api/src/features/engine/engine.game';
import { Button } from '../components/button';
import { ContentSwitcher } from '../components/content-switcher';
import { Card } from '../components/game/card';
import { Input } from '../components/input';
import { api } from '../lib/api';
import { CardDataProvider } from '../lib/card-data';

export const shouldRevalidate = (({ formMethod }) => {
	return formMethod === 'POST';
}) satisfies ShouldRevalidateFunction;

export const clientLoader = (async () => {
	return defer({
		cards: await api.cards.index.get().then(res => {
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
	const cardsString = search.get('cards') ?? '';
	const cardsList = cardsString.split(',').filter(Boolean);
	const actionData = useActionData<typeof clientAction>();

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
		<CardDataProvider value={cards}>
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

				<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-screen-lg flex-col gap-2 p-2">
					<header className="flex gap-2 p-2">
						<IconSettings /> <h1 className="heading-sm">Deck settings</h1>
					</header>
					<fieldset className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col gap-4 p-4 ring-1">
						<label htmlFor="name">
							<span className="label-sm">Name</span>
							<Input form="new-deck" id="name" type="text" name="name" />
						</label>
					</fieldset>
				</section>

				<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-screen-lg flex-col gap-2 py-2">
					<header className="flex gap-2 p-2 px-4">
						<IconCards /> <h1 className="heading-sm">Card library</h1>
					</header>

					<Form
						id="new-deck"
						className="flex flex-col gap-2 px-2"
						preventScrollReset
						onChange={e => submit(e.currentTarget, { preventScrollReset: true })}
					>
						<div className="self-center">
							<ContentSwitcher.Container name="color" defaultValue={filter ?? ''}>
								<ContentSwitcher.Item value="">All</ContentSwitcher.Item>
								{COLORS.map(color => (
									<ContentSwitcher.Item value={color} key={color}>
										{color}
									</ContentSwitcher.Item>
								))}
							</ContentSwitcher.Container>
						</div>
						<div className="group relative">
							<Input type="text" name="q" autoComplete="off" placeholder="Search" />
							<div className="absolute bottom-0 right-0 top-0 flex aspect-square items-center justify-center">
								<Button
									type="button"
									onClick={e => {
										if (!e.currentTarget.form) return;
										e.currentTarget.form.q.value = '';
										submit(e.currentTarget.form, { preventScrollReset: true });
									}}
									className="group-has-[input:placeholder-shown]:hidden"
									variant="ghost"
									size="icon"
								>
									<IconX />
								</Button>
							</div>
						</div>
						<input name="cards" type="hidden" defaultValue={cardsString} />

						<>
							<p className="body-xs text-neutral-11 text-center">Showing {cardsToDisplay.length} cards</p>
							<ul key={filter} className="grid grid-cols-2 gap-1 p-4 md:grid-cols-3 lg:grid-cols-4">
								{cardsToDisplay.map((id, i) => {
									const count = cardsList.filter(cardId => cardId === id).length;

									return (
										<li
											className="bg-neutral-11/5 rounded-2 flex flex-col items-center justify-center gap-2 p-1"
											key={id}
										>
											<Card className="w-full" size="lg" pubsubCard={{ id, key: i }} face="front" />

											<div className="flex items-center gap-2">
												<Button
													disabled={count >= 2}
													onClick={e => {
														const form = e.currentTarget.form;
														if (!form) return;
														const input = form.cards;
														if (!input) return;
														const value = input.value.split(',');
														value.push(id);
														input.value = value.join(',');
													}}
													variant="ghost"
													size="icon"
												>
													<IconPlus />
												</Button>

												<span>{count}</span>
												<Button
													disabled={count === 0}
													onClick={e => {
														const form = e.currentTarget.form;
														if (!form) return;
														const input = form.cards;
														if (!input) return;
														const value = input.value.split(',');
														value.splice(value.indexOf(id), 1);
														input.value = value.join(',');
													}}
													variant="ghost"
													size="icon"
												>
													<IconMinus />
												</Button>
											</div>
										</li>
									);
								})}
							</ul>
						</>
					</Form>
				</section>
			</div>
			<footer className="bg-lowest rounded-t-8 sticky bottom-0 flex flex-col items-center pb-4 pt-2 shadow-lg">
				<CurrentDeck cardsList={cardsList} />
				<div className="relative -mt-4 p-2">
					<Button form="new-deck" formMethod="POST" type="submit">
						Confirm
					</Button>
					{actionData?.error && (
						<p className="label-sm text-negative-10 flex items-center gap-2 px-2 py-1">
							<IconExclamationCircle className="text-negative-9" />
							<span>Invalid deck</span>
						</p>
					)}
				</div>
			</footer>
		</CardDataProvider>
	);
}

const CoverflowCard = ({
	id,
	index,
	viewportCentre,
}: {
	id: string;
	index: number;
	viewportCentre: MotionValue<number>;
}) => {
	const ref = useRef<HTMLLIElement>(null);
	const cardWidth = ref.current?.clientWidth ?? 0;
	const currentIndex = useTransform(() => viewportCentre.get() / cardWidth - 0.5);
	const rotateY = useTransform(() => Math.max(-60, Math.min(60, (currentIndex.get() - index) * 30)));
	const x = useTransform(() => {
		const diff = currentIndex.get() - index;
		return diff * Math.abs(diff * 2);
	});
	const zIndex = useTransform(() => 30 - Math.abs(index - currentIndex.get()));

	return (
		<motion.li ref={ref} style={{ zIndex, rotateY, x }} className="flex-none snap-center">
			<Card face="front" size="md" pubsubCard={{ id, key: 0 }} className="h-[15vh] shadow-md" />
		</motion.li>
	);
};
const CurrentDeck = ({ cardsList }: { cardsList: string[] }) => {
	const container = useRef<HTMLUListElement>(null);
	const { scrollX } = useScroll({ container, axis: 'x' });
	const viewportCentre = useTransform(() => {
		const viewportWidth = container.current?.clientWidth ?? 0;
		return scrollX.get() + viewportWidth / 2;
	});

	return (
		<ul
			ref={container}
			className="hide-scrollbars flex w-full snap-x snap-mandatory items-center overflow-x-auto py-4 [perspective:100vw]"
		>
			{cardsList.map((id, i) => (
				<CoverflowCard index={i} viewportCentre={viewportCentre} id={id} key={i} />
			))}
		</ul>
	);
};

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
