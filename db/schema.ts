import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const marketEvents = pgTable('market_events', {
	id: uuid('id').defaultRandom().primaryKey(),
	registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }).notNull(),
	registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }).notNull(),
	capacity: integer('capacity').notNull(),
	status: text('status').notNull().default('open'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const registrationQuestions = pgTable('registration_questions', {
	id: uuid('id').defaultRandom().primaryKey(),
	marketEventId: uuid('market_event_id')
		.notNull()
		.references(() => marketEvents.id, { onDelete: 'cascade' }),
	prompt: text('prompt').notNull(),
	type: text('type').notNull().default('text'),
	required: boolean('required').notNull().default(false),
	position: integer('position').notNull().default(0),
});

export const guests = pgTable('guests', {
	id: uuid('id').defaultRandom().primaryKey(),
	marketEventId: uuid('market_event_id').references(() => marketEvents.id, {
		onDelete: 'set null',
	}),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	age: integer('age').notNull(),
	householdSize: integer('household_size').notNull(),
	phone: text('phone').notNull(),
	locale: text('locale').notNull(),
	status: text('status').notNull().default('registered'),
	answers: jsonb('answers').$type<Record<string, string | number>>().notNull().default({}),
	source: text('source').notNull().default('self'),
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
