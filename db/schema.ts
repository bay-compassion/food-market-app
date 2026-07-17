import { boolean, date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const guests = pgTable('guests', {
	id: uuid('id').defaultRandom().primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	age: integer('age').notNull(),
	householdSize: integer('household_size').notNull(),
	phone: text('phone').notNull(),
	locale: text('locale').notNull(),
	status: text('status').notNull().default('queued'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable('visits', {
	id: uuid('id').defaultRandom().primaryKey(),
	guestId: uuid('guest_id')
		.notNull()
		.references(() => guests.id),
	visitDate: date('visit_date').notNull(),
	isFirstVisit: boolean('is_first_visit').notNull().default(false),
});
