import { Value } from '@sinclair/typebox/value';
import chalk from 'chalk';
import { eq } from 'drizzle-orm';
import { Elysia, Static, t } from 'elysia';

import { db } from '../../db';
import { games } from '../../db/schema';
import { DistributiveOmit } from '../../lib/type-utils';
import { delay, exhaustive, invariant, pill } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { deck } from '../card/card.fns';
import { resolveCombatValue } from '../card/card.fns.utils';
import { Board } from '../engine/engine.board';
import {
	COLORS,
	CombatStackItem,
	DynamicCombatValue,
	GameAction,
	GameCard,
	GameIterationResponse,
	SIDES,
	Side,
	SpellColor,
	createGameInstance,
	getCardColors,
} from '../engine/engine.game';
import { getGameById } from './game.api';

type GameRoomState = {
	connections: {
		sideA: { id: string; send: (data: any) => void } | undefined;
		sideB: { id: string; send: (data: any) => void } | undefined;
	};
	lastState: GameIterationResponse | undefined;
};

/** Card info that gets sent over the websockets connection */
export type PubSubHiddenCard = { key: number };
export type PubSubShownFieldCard = PubSubHiddenCard & { id: string; type: 'field' };
export type PubSubShownSpellCard = PubSubHiddenCard & { id: string; type: 'spell'; attack: number; heal?: number };
export type PubSubShownCard = PubSubShownFieldCard | PubSubShownSpellCard;
export type PubSubCard = PubSubHiddenCard | PubSubShownCard;

export type CompressedCombatStackItem = DistributiveOmit<CombatStackItem, 'source'> & { sourceKey: number | null };
export type SanitisedIteration = {
	side: Side;
	board: {
		attackStacks?: Record<Side, SpellColor | null>;
		combatStack?: CompressedCombatStackItem[];
		phase: Board['phase'];
		field: PubSubCard[];
		highlights: Record<string, 'effect' | 'negative' | 'positive'>;
	} & Record<
		Side,
		{
			hp: number;
			casting: Partial<Record<'field' | SpellColor, PubSubCard>>;
			drawPile: PubSubCard[];
			discardPile: PubSubCard[];
			hand: PubSubCard[];
			stacks: Record<SpellColor, PubSubCard[]>;
			action?: GameAction;
		}
	>;
};

export type PubSubError = { error: string };

const createCardActions = (params: Omit<Parameters<DynamicCombatValue['getValue']>[0], 'thisCard'>) => {
	return {
		hideCard: (card: GameCard): PubSubHiddenCard => ({ key: card.key }),
		showCard: (card: GameCard): PubSubShownCard => {
			switch (card.type) {
				case 'field':
					return {
						key: card.key,
						id: card.id,
						type: card.type,
					};
				case 'spell':
					return {
						key: card.key,
						id: card.id,
						type: card.type,
						attack: resolveCombatValue(card.attack, { ...params, thisCard: card }),
						heal: card.heal ? resolveCombatValue(card.heal, { ...params, thisCard: card }) : undefined,
					};
			}
		},
	};
};

/**
 * Clears data that’s not supposed to make it to end users.
 * E.g.: Deck cards are never supposed to be sent to the client.
 */
const sanitiseIteration = (playerSide: Side, originalIteration: GameIterationResponse) => {
	const { hideCard, showCard } = createCardActions({
		game: originalIteration,
		ownerSide: playerSide,
		opponentSide: playerSide === 'sideA' ? 'sideB' : 'sideA',
	});

	const iteration: SanitisedIteration = {
		side: playerSide,
		board: {
			combatStack:
				originalIteration.board.phase === 'damage' ?
					originalIteration.turn.combatStack.map(item => ({
						target: item.target,
						value: item.value,
						type: item.type,
						sourceKey: item.source?.key ?? null,
					}))
				:	undefined,
			highlights: {},
			field: originalIteration.board.field.map(showCard),
			phase: originalIteration.board.phase,
			sideA: {
				hp: originalIteration.board.players.sideA.hp,
				casting: {},
				discardPile: [],
				drawPile: [],
				hand: [],
				stacks: {
					blue: [],
					green: [],
					red: [],
				},
			},
			sideB: {
				hp: originalIteration.board.players.sideB.hp,
				casting: {},
				discardPile: [],
				drawPile: [],
				hand: [],
				stacks: {
					blue: [],
					green: [],
					red: [],
				},
			},
		},
	};

	const highlightTypes = ['effect', 'positive', 'negative'] as const;
	for (const type of highlightTypes) {
		for (const cardKey of originalIteration.highlights[type]) {
			iteration.board.highlights[cardKey] = type;
		}
	}

	SIDES.forEach(side => {
		const hideUnlessOwner = side === playerSide ? showCard : hideCard;
		iteration.board[side].drawPile = originalIteration.board.players[side].drawPile.map(hideCard);
		iteration.board[side].discardPile = originalIteration.board.players[side].discardPile.map(hideCard);
		iteration.board[side].hand = originalIteration.board.players[side].hand.map(hideUnlessOwner);
		// everyone can see the stacks
		COLORS.forEach(stack => {
			iteration.board[side].stacks[stack] = originalIteration.board.players[side].stacks[stack].map(showCard);

			const casting = originalIteration.board.players[side].casting[stack];
			if (casting) {
				iteration.board[side].casting[stack] = hideCard(casting);
			}
		});
		const castingField = originalIteration.board.players[side].casting.field;
		if (castingField) {
			iteration.board[side].casting.field = hideCard(castingField);
		}
		iteration.board[side].action = originalIteration.actions[side];
	});

	if (originalIteration.board.phase === 'combat') {
		iteration.board.attackStacks = {
			sideA: originalIteration.turn.sideA.spellAttack?.slot ?? null,
			sideB: originalIteration.turn.sideB.spellAttack?.slot ?? null,
		};
	}
	return iteration;
};

const createGameRoom = () => {
	const game = createGameInstance({
		// Mock decks for testing
		decks: { sideA: deck, sideB: deck },
		settings: {
			castTimeoutMs: 60000,
			spellTimeoutMs: 60000,
			startingCards: 2,
			emptySlotAttack: 10,
			phaseDelayMs: 1000,
		},
	});
	const state: GameRoomState = {
		connections: { sideA: undefined, sideB: undefined },
		lastState: undefined,
	};

	const handleGame = async () => {
		for await (const iteration of game) {
			state.lastState = iteration;
			SIDES.forEach(side => state.connections[side]?.send(iteration));
			await delay(350);
		}
	};
	handleGame();

	return {
		state,
		join: (side: Side, connectionId: string, sendFn: (data: SanitisedIteration) => void) => {
			state.connections[side] = {
				id: connectionId,
				send: (data: GameIterationResponse) => sendFn(sanitiseIteration(side, data)),
			};
			if (state.lastState) state.connections[side]?.send(state.lastState);
		},
		leave: (connectionId: string) => {
			if (state.connections.sideA?.id === connectionId) {
				state.connections.sideA = undefined;
				return { ok: true };
			}
			if (state.connections.sideB?.id === connectionId) {
				state.connections.sideB = undefined;
				return { ok: true };
			}
			return { ok: false };
		},
	};
};

type GameRoom = ReturnType<typeof createGameRoom>;

/** In-memory storage of all instances. */
const runningGameRooms: Record<string, GameRoom> = {};

export const gamePubSub = new Elysia().use(withUser).ws('/:id/pubsub', {
	async open(ws) {
		const user = ws.data.user;

		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;

		const game = await getGameById(Number(channel), user);
		if (!game) {
			ws.send({ error: 'Game not found' });
			return;
		}

		const sideToJoin =
			game.sideA === user.id ? 'sideA'
			: game.sideB === user.id ? 'sideB'
			: undefined;

		if (!sideToJoin) {
			ws.send({ error: 'Unauthorised' });
			return;
		}

		switch (game.status) {
			case 'CREATED': {
				const room = runningGameRooms[channel] ?? (runningGameRooms[channel] = createGameRoom());
				room.join(sideToJoin, ws.id, ws.send);
				ws.subscribe(channel);
				console.log(
					`⚡ (${channel}) “${user.username ?? user.id}” is now`,
					chalk.green(`\uE0B6${chalk.bgGreen(`online`)}\uE0B4`),
				);
				break;
			}
			case 'PLAYING': {
				const room = runningGameRooms[channel];
				if (!room) {
					// This should never happen, but in case the server restarts with a `PLAYING` game in the db, we need to handle it.
					ws.send({ error: 'Game room not found.' });
					await db.update(games).set({ status: 'FINISHED' }).where(eq(games.id, game.id));
					return;
				}
				room.join(sideToJoin, ws.id, ws.send);
				ws.subscribe(channel);
				console.log(
					`⚡ (${channel}) “${user.username ?? user.id}” is now`,
					chalk.green(`\uE0B6${chalk.bgGreen(`online`)}\uE0B4`),
				);
				break;
			}
			case 'FINISHED':
				ws.send({ error: 'Game already finished.' });
				break;
			default:
				throw exhaustive(game.status);
		}
	},
	close(ws) {
		const user = ws.data.user;
		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;
		ws.unsubscribe(channel);
		const game = runningGameRooms[channel];
		if (!game) return;
		const left = game.leave(ws.id);
		if (left.ok) {
			console.log(
				`⚡ (${channel}) “${user.username ?? user.id}” is now`,
				chalk.red(`\uE0B6${chalk.bgRed(`offline`)}\uE0B4`),
			);
		}
	},
	async message(ws, message) {
		const user = ws.data.user;

		if (!user) {
			ws.send({ error: 'Unauthorised' });
			return;
		}
		const channel = ws.data.params.id;
		const game = await getGameById(Number(channel), user);
		const ongoingGame = runningGameRooms[channel];
		if (!game || !ongoingGame) {
			ws.send({ error: 'Game not found' });
			return;
		}

		const userSide =
			ongoingGame.state.connections.sideA?.id === ws.id ? 'sideA'
			: ongoingGame.state.connections.sideB?.id === ws.id ? 'sideB'
			: undefined;

		if (!userSide) {
			ws.send({ error: 'Unauthorised' });
			return;
		}

		const action = ongoingGame.state.lastState?.actions[userSide];
		if (!action) {
			ws.send({ error: 'Action not requested' });
			return;
		}

		try {
			const state = ongoingGame.state.lastState;
			invariant(state, 'No state found');
			for await (const iteration of validateAction({
				action,
				message,
				side: userSide,
				game: state,
				logSuccess: message => console.log(`⚡ (${channel}) “${user.username ?? user.id}”`, message),
			})) {
				ongoingGame.state.lastState = iteration;
				SIDES.forEach(side => ongoingGame.state.connections[side]?.send(iteration));
				await delay(350);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid Action';
			console.log(`⚡ (${channel}) “${user.username ?? user.id}”:`, errorMessage);
			console.error(error);
			ws.send({ error: errorMessage });
			return;
		}
	},
});

const SelectFromHandMessageSchema = t.Object({
	type: t.Literal('select_from_hand'),
	cardKeys: t.Array(t.Number()),
});
export type SelectFromHandMessageSchema = Static<typeof SelectFromHandMessageSchema>;

const SelectStackMessageSchema = t.Object({
	type: t.Literal('select_spell_stack'),
	stacks: t.Array(t.Union([t.Literal('blue'), t.Literal('green'), t.Literal('red')])),
});
export type SelectStackMessageSchema = Static<typeof SelectStackMessageSchema>;

async function* validateAction({
	action,
	game,
	logSuccess,
	message,
	side,
}: {
	action: NonNullable<NonNullable<GameIterationResponse['actions']>[Side]>;
	message: unknown;
	side: Side;
	game: GameIterationResponse;
	logSuccess: (message: string) => void;
}) {
	switch (action.type) {
		case 'select_from_hand': {
			const payload = Value.Decode(SelectFromHandMessageSchema, message);

			const invalidLength = payload.cardKeys.length < action.config.min || payload.cardKeys.length > action.config.max;
			if (invalidLength) throw new Error(`Please select between ${action.config.min} and ${action.config.max} cards`);

			const selectedCards = payload.cardKeys.map(key => {
				const card = game.board.players[side].hand.find(card => card.key === key);
				invariant(card, `Card not found in hand`);
				return card;
			});

			const invalidType = selectedCards.some(card => !action.config.availableTypes.includes(card.type));
			if (invalidType) throw new Error(`Please select a ${action.config.availableTypes.join(' or ')} card`);

			const invalidColors = selectedCards.some(card => {
				const colors = getCardColors(card);
				if (colors.length === 0) return false;
				return !colors.some(color => action.config.availableColors.includes(color));
			});
			if (invalidColors) throw new Error(`Please select a ${action.config.availableColors.join(' or ')} card`);

			yield* action.submit({ side, cardKeys: payload.cardKeys });
			logSuccess(`selected ${selectedCards.map(card => pill('gray', card.name)).join(', ')} from hand`);
			return;
		}
		case 'select_spell_stack': {
			const payload = Value.Decode(SelectStackMessageSchema, message);

			const invalidLength = payload.stacks.length < action.config.min || payload.stacks.length > action.config.max;
			if (invalidLength) throw new Error(`Please select between ${action.config.min} and ${action.config.max} cards`);

			const invalidColors = payload.stacks.some(stack => !action.config.availableStacks.includes(stack));
			if (invalidColors) throw new Error(`Please select only ${action.config.availableStacks.join(' or ')} stacks`);

			yield* action.submit({ side, stacks: payload.stacks });
			logSuccess(`selected ${payload.stacks.join(', ')} stack${payload.stacks.length > 1 ? 's' : ''}`);
			return;
		}
		default:
			throw new Error('Not implemented');
	}
}
