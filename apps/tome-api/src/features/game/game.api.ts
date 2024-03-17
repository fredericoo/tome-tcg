import { and, eq, or } from 'drizzle-orm';
import { User } from 'lucia';

import { db } from '../../db';
import { games } from '../../db/schema';
import { takeFirst } from '../../lib/utils';

export const getGameById = async (id: number, user: User) => {
	const gameIncludesUser = or(eq(games.sideA, user.id), eq(games.sideB, user.id));
	const game = await db
		.select()
		.from(games)
		.where(and(eq(games.id, id), gameIncludesUser))
		.limit(1)
		.then(takeFirst);
	return game;
};
