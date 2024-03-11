import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const cards = sqliteTable('cards', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description').notNull(),
});
