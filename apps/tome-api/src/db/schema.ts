import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const cards = sqliteTable('cards', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description').notNull(),
});

export const users = sqliteTable('user', {
	id: text('id', {
		length: 255,
	}).primaryKey(),
	username: text('username'),
	githubId: integer('github_id').unique(),
	avatarUrl: text('avatar_url'),
});

export const sessions = sqliteTable('session', {
	id: text('id', {
		length: 255,
	}).primaryKey(),
	userId: text('user_id', {
		length: 255,
	})
		.notNull()
		.references(() => users.id),
	expiresAt: integer('timestamp').notNull(),
});

export const games = sqliteTable('games', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	sideA: text('side_a')
		.notNull()
		.references(() => users.id),
	sideB: text('side_b')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	status: text('status', { enum: ['CREATED', 'PLAYING', 'FINISHED'] }).notNull(),
	castTimeoutMs: integer('cast_timeout_ms').notNull().default(60000),
	spellTimeoutMs: integer('cast_timeout_ms').notNull().default(60000),
	phaseDelayMs: integer('phase_delay_ms').notNull().default(1000),
	startingCards: integer('starting_cards').notNull().default(2),
});
