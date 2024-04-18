import { Form, Link, ShouldRevalidateFunction, useSearchParams, useSubmit } from '@remix-run/react';
import {
	IconArrowLeft,
	IconCards,
	IconChevronCompactDown,
	IconExclamationCircle,
	IconMinus,
	IconPlus,
	IconSettings,
	IconX,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ActionFunction, LoaderFunction, defer, redirect, useActionData, useLoaderData } from 'react-router-typesafe';
import { create } from 'zustand';

import { CardSlug } from '../../../tome-api/src/features/card/card.db';
import { COLORS } from '../../../tome-api/src/features/engine/engine.game';
import { Button } from '../components/button';
import { ContentSwitcher } from '../components/content-switcher';
import { Card, cardColorClass } from '../components/game/card';
import { Input } from '../components/input';
import { api } from '../lib/api';
import { CardDataProvider, useCardData } from '../lib/card-data';

type CardBuilderStore = {
	/** {card_id: quantity} */
	cards: Partial<Record<CardSlug, number>>;
	addCard: (id: CardSlug) => void;
	removeCard: (id: CardSlug) => void;
};

const useCardBuilderStore = create<CardBuilderStore>(set => ({
	cards: {},
	addCard: id =>
		set(state => {
			const qty = state.cards[id];
			if (qty && qty >= 2) return state;
			return { cards: { ...state.cards, [id]: (qty ?? 0) + 1 } };
		}),
	removeCard: id =>
		set(state => {
			const newCards = { ...state.cards };
			if (!newCards[id]) return state;
			if (newCards[id]! > 1) {
				newCards[id]!--;
			} else {
				delete newCards[id];
			}
			return { cards: newCards };
		}),
}));

const cardsToString = (cards: Record<string, number>) => {
	return Object.entries(cards)
		.flatMap(([id, count]) => Array(count).fill(id))
		.join(',');
};

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
	const allCards = Object.keys(cards) as CardSlug[];
	const cardsToDisplay = allCards
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
					</Form>

					<>
						<p className="body-xs text-neutral-11 text-center">Showing {cardsToDisplay.length} cards</p>
						<ul key={filter} className="grid grid-cols-2 gap-1 p-4 md:grid-cols-3 lg:grid-cols-4">
							{cardsToDisplay.map(id => {
								return (
									<li
										className="bg-neutral-11/5 rounded-2 flex flex-col items-center justify-center gap-2 p-1"
										key={id}
									>
										<CardActionList id={id} />
									</li>
								);
							})}
						</ul>
					</>
				</section>
			</div>

			<DeckFloatingMenu />
		</CardDataProvider>
	);
}

const CardActionList = ({ id }: { id: CardSlug }) => {
	const qty = useCardBuilderStore(state => state.cards[id] ?? 0);
	const addCard = useCardBuilderStore(state => state.addCard);
	const removeCard = useCardBuilderStore(state => state.removeCard);

	return (
		<>
			<button
				className={clsx('fr ease-expo-out w-full transition-opacity duration-300', { 'opacity-50': qty >= 2 })}
				onClick={() => addCard(id)}
				disabled={qty >= 2}
			>
				<Card className="w-full" size="lg" pubsubCard={{ id, key: 0 }} face="front" />
			</button>
			<div className="flex items-center gap-2">
				<Button disabled={qty >= 2} onClick={() => addCard(id)} variant="ghost" size="icon">
					<IconPlus />
				</Button>

				<span>{qty}</span>

				<Button disabled={qty === 0} onClick={() => removeCard(id)} variant="ghost" size="icon">
					<IconMinus />
				</Button>
			</div>
		</>
	);
};

const DeckFloatingMenu = () => {
	const [state, setState] = useState<'open' | 'closed'>('open');
	const cardData = useCardData();
	const cardsList = useCardBuilderStore(state => state.cards);

	const { red, green, blue, neutral } = Object.entries(cardsList).reduce(
		(acc, [id, qty]) => {
			const card = cardData[id];
			if (!card) return acc;

			if (card.type === 'field') {
				acc[card.color ?? 'neutral']++;
			} else {
				if (card.colors.length === 0) acc.neutral++;
				COLORS.forEach(color => {
					if (card.colors.includes(color)) acc[color] += qty;
				});
			}
			return acc;
		},
		{ red: 0, green: 0, blue: 0, neutral: 0 },
	);
	const cardsLength = Object.values(cardsList).reduce((acc, qty) => acc + qty, 0);

	return (
		<footer
			className={clsx('sticky bottom-0 p-2 transition-transform duration-500', {
				'translate-y-full': cardsLength === 0,
			})}
		>
			<div
				className={clsx(
					'bg-neutral-12 ring-neutral-11/10 rounded-4 ease-expo-out mx-auto flex max-w-screen-md flex-col shadow-lg ring-2 ',
				)}
			>
				<button
					onClick={() => setState(s => (s === 'closed' ? 'open' : 'closed'))}
					className="fr rounded-t-4 flex gap-2 px-2 py-3"
				>
					<div className="text-neutral-4 flex flex-1 items-center px-2">
						<div className="flex items-center gap-1">
							<IconCards />
							<p>
								<span className={clsx('label-md', { 'text-negative-9': cardsLength > 30 })}>{cardsLength}</span>
								<span className="label-xs opacity-50">/30</span>
							</p>
						</div>
					</div>

					<div className="text-neutral-1">
						{state === 'open' ?
							<IconChevronCompactDown />
						:	<span>View deck</span>}
					</div>

					<ul className="label-sm text-neutral-1 flex flex-1 flex-wrap items-end justify-end gap-3 px-2">
						<li className="flex items-center gap-1">
							<div className={cardColorClass({ color: 'red', className: 'h-2 w-2 rounded-full bg-current' })} />
							<span>{red}</span>
						</li>
						<li className="flex items-center gap-1">
							<div className={cardColorClass({ color: 'green', className: 'h-2 w-2 rounded-full bg-current' })} />
							<span>{green}</span>
						</li>
						<li className="flex items-center gap-1">
							<div className={cardColorClass({ color: 'blue', className: 'h-2 w-2 rounded-full bg-current' })} />
							<span>{blue}</span>
						</li>
						<li className="flex items-center gap-1">
							<div className="bg-neutral-9 h-2 w-2 rounded-full" />
							<span>{neutral}</span>
						</li>
					</ul>
				</button>

				<div className={clsx('[content:paint]', { hidden: state !== 'open' })}>
					<CurrentDeck />
				</div>
			</div>
		</footer>
	);
};

const CoverflowCard = ({ id, parentRef }: { id: string; parentRef: React.RefObject<HTMLUListElement> }) => {
	const ref = useRef<HTMLLIElement>(null);
	const { scrollXProgress } = useScroll({
		container: parentRef,
		target: ref,
		axis: 'x',
		offset: ['start end', 'end start'],
		layoutEffect: false,
	});

	const rotateY = useTransform(() => {
		const diff = scrollXProgress.get() - 0.5;
		return Math.tanh(diff * 8) * 60;
	});
	const x = useTransform(() => {
		const diff = scrollXProgress.get() - 0.5;
		return diff * Math.abs(diff * 128);
	});
	const zIndex = useTransform(() => {
		const diff = scrollXProgress.get() - 0.5;
		return 30 - Math.abs(diff);
	});

	return (
		<motion.li
			initial={{ opacity: 0, y: -100 }}
			animate={{ y: 0, opacity: 1 }}
			exit={{ y: -100, opacity: 0, width: 0 }}
			ref={ref}
			style={{ zIndex, rotateY, x }}
			className="flex-none"
		>
			<Card face="front" size="sm" pubsubCard={{ id, key: 0 }} className="h-[10vh] shadow-md" />
		</motion.li>
	);
};

const CurrentDeck = () => {
	const cards = useCardBuilderStore(state => state.cards);
	const ref = useRef<HTMLUListElement>(null);
	const cardsList = Object.entries(cards).flatMap(([id, qty]) => new Array<string>(qty).fill(id));
	const lastCard = cardsList.at(-1);
	// every time the last card changes, we scroll to the right of the list
	useEffect(() => {
		if (ref.current)
			ref.current.scrollTo({ left: ref.current.scrollWidth - ref.current.clientWidth, behavior: 'smooth' });
	}, [lastCard]);

	return (
		<>
			<ul
				ref={ref}
				className="hide-scrollbars flex w-full items-center overflow-x-auto scroll-smooth px-[50%] py-2 [perspective:768px]"
			>
				<AnimatePresence mode="sync">
					{cardsList.map((id, i) => {
						const key = id + cardsList.slice(0, i).filter(c => c === id).length;
						return <CoverflowCard id={id} key={key} parentRef={ref} />;
					})}
				</AnimatePresence>
			</ul>
			<Form method="POST" className="flex flex-col items-center pb-2">
				<input name="cards" type="hidden" defaultValue={cardsToString(cards)} />
				<Button variant="outline" form="new-deck" formMethod="POST" type="submit" className="rounded-full">
					Confirm
				</Button>
				<ErrorMessage />
			</Form>
		</>
	);
};

const ErrorMessage = () => {
	const actiondata = useActionData<typeof clientAction>();
	const isError = Boolean(actiondata?.error);
	if (!isError) return null;

	return (
		<p className="label-sm text-negative-10 flex items-center gap-2 px-2 py-1">
			<IconExclamationCircle className="text-negative-9" />
			<span>Invalid deck</span>
		</p>
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
