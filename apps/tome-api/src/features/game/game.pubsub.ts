import { Value } from '@sinclair/typebox/value';
import chalk from 'chalk';
import { eq } from 'drizzle-orm';
import { Elysia, Static, t } from 'elysia';

import { db } from '../../db';
import { games } from '../../db/schema';
import { DistributiveOmit } from '../../lib/type-utils';
import { delay, exhaustive, invariant, pill, takeFirstOrThrow } from '../../lib/utils';
import { withUser } from '../auth/auth.plugin';
import { deck } from '../card/card.fns';
import { resolveCombatValue } from '../card/card.fns.utils';
import { Board } from '../engine/engine.board';
import {
	COLORS,
	CombatStackItem,
	FieldCard,
	GameAction,
	GameCard,
	GameIteration,
	GameState,
	SIDES,
	Side,
	SpellColor,
	VfxIteration,
	createGameInstance,
	getCardColors,
} from '../engine/engine.game';
import { getGameById } from './game.api';

type GameRoomState = {
	state: 'LOBBY' | 'PLAYING';
	connections: {
		sideA: { id: string; send: (data: any) => void } | undefined;
		sideB: { id: string; send: (data: any) => void } | undefined;
	};
	lastState: GameState | undefined;
};

/** Card info that gets sent over the websockets connection */
export type PubSubHiddenCard = { key: number };
export type PubSubShownFieldCard = PubSubHiddenCard & { id: string; type: 'field' };
export type PubSubShownSpellCard = PubSubHiddenCard & { id: string; type: 'spell'; attack: number; heal?: number };
export type PubSubShownCard = PubSubShownFieldCard | PubSubShownSpellCard;
export type PubSubCard = PubSubHiddenCard | PubSubShownCard;

export type CompressedCombatStackItem = DistributiveOmit<CombatStackItem, 'source'> & { sourceKey: number | null };

export type SanitisedGameState = {
	sentAt: number;
	type: 'state';
	side: Side;
	board: {
		phase: Board['phase'];
		field: PubSubCard[];
		discardPile: PubSubCard[];
	} & Record<
		Side,
		{
			hp: number;
			casting: Partial<Record<'field' | SpellColor, PubSubCard>>;
			drawPile: PubSubCard[];
			hand: PubSubCard[];
			stacks: Record<SpellColor, PubSubCard[]>;
			action?: GameAction;
		}
	>;
};

type SanitisedVfx = VfxIteration;

type SanitisedIteration = SanitisedGameState | SanitisedVfx;

export type PubSubError = { error: string };

const createCardActions = ({ game }: { game: GameState }) => {
	return {
		hideCard: (card: GameCard): PubSubHiddenCard => ({ key: card.key }),
		showFieldCard: (card: FieldCard) => ({
			key: card.key,
			id: card.id,
			type: card.type,
		}),
		showCardFromSide:
			(ownerSide: Side) =>
			(card: GameCard): PubSubShownCard => {
				const opponentSide = ownerSide === 'sideA' ? 'sideB' : 'sideA';
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
							attack: resolveCombatValue(card.attack, { game, thisCard: card, ownerSide, opponentSide }),
							heal:
								card.heal ?
									resolveCombatValue(card.heal, { game, thisCard: card, ownerSide, opponentSide })
								:	undefined,
						};
				}
			},
	};
};

/**
 * Clears data that’s not supposed to make it to end users.
 * E.g.: Deck cards are never supposed to be sent to the client.
 */
const sanitiseIteration = (playerSide: Side, originalIteration: GameIteration): SanitisedIteration => {
	switch (originalIteration.type) {
		case 'state': {
			const { hideCard, showCardFromSide, showFieldCard } = createCardActions({
				game: originalIteration,
			});

			const iteration: SanitisedGameState = {
				sentAt: Date.now(),
				type: 'state',
				side: playerSide,
				board: {
					discardPile: [],
					field: originalIteration.board.field.map(showFieldCard),
					phase: originalIteration.board.phase,
					sideA: {
						hp: originalIteration.board.players.sideA.hp,
						casting: {},
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

			SIDES.forEach(side => {
				const showCard = showCardFromSide(side);
				const hideUnlessOwner = side === playerSide ? showCard : hideCard;
				iteration.board[side].drawPile = originalIteration.board.players[side].drawPile.map(hideCard);
				iteration.board.discardPile = originalIteration.board.discardPile.map(hideCard);
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
			return iteration;
		}
		case 'attack':
		case 'highlight':
			return originalIteration;
	}
};

const createGameRoom = (gameId: number) => {
	const room: GameRoomState = {
		state: 'LOBBY',
		connections: { sideA: undefined, sideB: undefined },
		lastState: undefined,
	};

	const startGame = async () => {
		const game = await db
			.update(games)
			.set({ status: 'PLAYING' })
			.where(eq(games.id, gameId))
			.returning()
			.then(takeFirstOrThrow);
		const gameInstance = createGameInstance({
			// Mock decks for testing
			decks: { sideA: deck, sideB: deck },
			settings: {
				castTimeoutMs: game.castTimeoutMs,
				spellTimeoutMs: game.spellTimeoutMs,
				startingCards: game.startingCards,
				phaseDelayMs: game.phaseDelayMs,
				emptySlotAttack: 10,
				effectHighlightMs: 300,
			},
		});
		const handleGame = async () => {
			for await (const iteration of gameInstance) {
				// only set last state if iteration is a game state
				if ('board' in iteration) {
					room.lastState = iteration;
				}
				SIDES.forEach(side => {
					return room.connections[side]?.send(iteration);
				});
			}
		};
		handleGame();
	};

	return {
		state: room,
		join: (side: Side, connectionId: string, sendFn: (data: SanitisedIteration) => void) => {
			room.connections[side] = {
				id: connectionId,
				send: (data: GameState) => sendFn(sanitiseIteration(side, data)),
			};
			if (room.lastState) room.connections[side]?.send(room.lastState);

			if (room.state === 'LOBBY') {
				const readyToStart =
					process.env.NODE_ENV === 'development' || Boolean(room.connections.sideA && room.connections.sideB);
				if (readyToStart) {
					room.state = 'PLAYING';
					startGame();
				}
			}
		},
		leave: (connectionId: string) => {
			if (room.connections.sideA?.id === connectionId) {
				room.connections.sideA = undefined;
				return { ok: true };
			}
			if (room.connections.sideB?.id === connectionId) {
				room.connections.sideB = undefined;
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
				const room = runningGameRooms[channel] ?? (runningGameRooms[channel] = createGameRoom(game.id));
				room.join(sideToJoin, ws.id, ws.send);
				ws.subscribe(channel);
				console.log(
					`⚡ (${channel}) “${user.username ?? user.id}” is now`,
					chalk.green(`\uE0B6${chalk.bgGreen(`online`)}\uE0B4`),
				);
				break;
			}
			case 'PLAYING': {
				let room = runningGameRooms[channel];
				if (process.env.NODE_ENV !== 'development') {
					room = room ?? createGameRoom(game.id);
				}
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
	action: NonNullable<NonNullable<GameState['actions']>[Side]>;
	message: unknown;
	side: Side;
	game: GameState;
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
