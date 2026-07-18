import { sql } from 'drizzle-orm';
import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { SessionMode, SessionStatus } from '../src/services/sessionStateMachine';

export const marketEvents = pgTable('market_events', {
	id: uuid('id').defaultRandom().primaryKey(),
	registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }).notNull(),
	registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }).notNull(),
	capacity: integer('capacity').notNull(),
	sessionMode: text('session_mode').$type<SessionMode>().notNull().default('scheduled'),
	status: text('status').$type<SessionStatus>().notNull().default('draft'),
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
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	age: integer('age').notNull(),
	householdSize: integer('household_size').notNull(),
	phone: text('phone').notNull(),
	normalizedPhone: text('normalized_phone').notNull(),
	pinHash: text('pin_hash'),
	locale: text('locale').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable('visits', {
	id: uuid('id').defaultRandom().primaryKey(),
	marketEventId: uuid('market_event_id')
		.notNull()
		.references(() => marketEvents.id),
	guestId: uuid('guest_id')
		.notNull()
		.references(() => guests.id),
	status: text('status').notNull().default('registered'),
	answers: jsonb('answers').$type<Record<string, string | number>>().notNull().default({}),
	source: text('source').notNull().default('self'),
	accessTokenHash: text('access_token_hash').notNull().unique(),
	visitDate: date('visit_date')
		.notNull()
		.default(sql`CURRENT_DATE`),
	isFirstVisit: boolean('is_first_visit').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const guestPinAttempts = pgTable('guest_pin_attempts', {
	normalizedPhone: text('normalized_phone').primaryKey(),
	failureCount: integer('failure_count').notNull().default(0),
	windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull().defaultNow(),
	lockedUntil: timestamp('locked_until', { withTimezone: true }),
});
