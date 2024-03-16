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
});
