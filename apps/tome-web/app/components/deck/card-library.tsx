import { Form, useSearchParams, useSubmit } from '@remix-run/react';
import { IconCards, IconX } from '@tabler/icons-react';

import { CardSlug } from '../../../../tome-api/src/features/card/card.db';
import { COLORS } from '../../../../tome-api/src/features/engine/engine.game';
import { useCardData } from '../../lib/card-data';
import { Button } from '../button';
import { ContentSwitcher } from '../content-switcher';
import { Input } from '../input';
import { CardWithAction } from './card-library-item';

export const CardLibrary = () => {
	const cardData = useCardData();
	const [search] = useSearchParams();
	const filter = search.get('color');
	const searchByName = search.get('q');

	const allCards = Object.keys(cardData) as CardSlug[];

	const cardsToDisplay = allCards
		.filter(id => {
			const card = cardData[id];
			if (!card) return false;
			return (
				!filter ||
				(card.type === 'field' && card.color === filter) ||
				(card.type === 'spell' && card.colors.includes(filter))
			);
		})
		.filter(id => {
			const card = cardData[id];
			return !searchByName || card?.name.toLowerCase().includes(searchByName.toLowerCase());
		});

	const submit = useSubmit();

	return (
		<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-screen-lg flex-col gap-2 py-2">
			<header className="flex gap-2 p-2 px-4">
				<IconCards /> <h1 className="heading-sm">Card library</h1>
			</header>

			<Form
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
							<li className="bg-neutral-11/5 rounded-2 flex flex-col items-center justify-center gap-2 p-1" key={id}>
								<CardWithAction id={id} />
							</li>
						);
					})}
				</ul>
			</>
		</section>
	);
};
