import { Form } from '@remix-run/react';
import { IconExclamationCircle } from '@tabler/icons-react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useActionData } from 'react-router-typesafe';

import { Button } from '../button';
import { Card } from '../game/card';
import { cardsMapToArray, useCardBuilderStore } from './card-builder-store';

const ErrorMessage = () => {
	const actiondata = useActionData() as { error?: unknown };
	const isError = Boolean(actiondata?.error);
	if (!isError) return null;

	return (
		<p className="label-sm text-negative-10 flex items-center gap-2 px-2 py-1">
			<IconExclamationCircle className="text-negative-9" />
			<span>Invalid deck</span>
		</p>
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
			className="flex-none snap-center"
		>
			<Card face="front" size="sm" pubsubCard={{ id, key: 0 }} className="h-[10vh] shadow-md" />
		</motion.li>
	);
};

export const CurrentDeck = () => {
	const cards = useCardBuilderStore(state => state.cards);
	const ref = useRef<HTMLUListElement>(null);
	const cardsList = cardsMapToArray(cards);

	const lastCard = cardsList.at(-1);

	useEffect(() => {
		const wrapper = ref.current;
		if (!wrapper) return;

		const snapOn = () => (wrapper.dataset.snap = 'true');

		wrapper.addEventListener('scrollend', snapOn);
		return () => {
			wrapper.removeEventListener('scrollend', snapOn);
		};
	}, []);

	// every time the last card changes, we scroll to the right of the list
	useEffect(() => {
		if (ref.current) {
			ref.current.dataset.snap = 'false';
			ref.current.scrollTo({ left: ref.current.scrollWidth - ref.current.clientWidth, behavior: 'smooth' });
		}
	}, [lastCard]);

	return (
		<>
			<ul
				ref={ref}
				data-snap="true"
				className="hide-scrollbars relative flex w-full items-center overflow-x-auto scroll-smooth px-[calc(50%-(63/88)*10vh/2)] py-2 [perspective:768px] data-[snap=true]:snap-x data-[snap=true]:snap-mandatory"
			>
				<AnimatePresence mode="sync" initial={false}>
					{cardsList.map((id, i) => {
						const key = id + cardsList.slice(0, i).filter(c => c === id).length;
						return <CoverflowCard id={id} key={key} parentRef={ref} />;
					})}
				</AnimatePresence>
			</ul>
			<Form id="deck-builder" method="POST" className="flex flex-col items-center pb-2">
				<input name="cards" type="hidden" defaultValue={cardsList.join(',')} />
				<Button variant="outline" type="submit" className="rounded-full">
					Confirm
				</Button>
				<ErrorMessage />
			</Form>
		</>
	);
};
