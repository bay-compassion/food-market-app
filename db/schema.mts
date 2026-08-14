import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

import type { SessionMode, SessionStatus } from '../src/services/sessionStateMachine';
import type { VisitStatus } from '../src/services/visitStateMachine';

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
	status: text('status').$type<VisitStatus>().notNull().default('registered'),
	queuePosition: integer('queue_position'),
	/** Relative odds in the lottery: a visit weighted 2 is twice as likely to be drawn as a 1. */
	lotteryWeight: integer('lottery_weight').notNull().default(1),
	calledAt: timestamp('called_at', { withTimezone: true }),
	/** When service finished. Null for a visit never served, and for one recorded after the fact. */
	servedAt: timestamp('served_at', { withTimezone: true }),
	answers: jsonb('answers').$type<Record<string, string | number>>().notNull().default({}),
	source: text('source').notNull().default('self'),
	accessTokenHash: text('access_token_hash').notNull().unique(),
	visitDate: date('visit_date')
		.notNull()
		.default(sql`CURRENT_DATE`),
	isFirstVisit: boolean('is_first_visit').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pushSubscriptions = pgTable(
	'push_subscriptions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => visits.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('push_subscriptions_visit_idx').on(table.visitId),
		uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
	],
);

export const notificationDeliveries = pgTable(
	'notification_deliveries',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => visits.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		dedupeKey: text('dedupe_key').notNull(),
		title: text('title'),
		body: text('body'),
		status: text('status').notNull().default('pending'),
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		sentAt: timestamp('sent_at', { withTimezone: true }),
	},
	(table) => [
		uniqueIndex('notification_deliveries_visit_dedupe_idx').on(table.visitId, table.dedupeKey),
		index('notification_deliveries_status_idx').on(table.status, table.createdAt),
	],
);

export const guestPinAttempts = pgTable('guest_pin_attempts', {
	normalizedPhone: text('normalized_phone').primaryKey(),
	failureCount: integer('failure_count').notNull().default(0),
	windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull().defaultNow(),
	lockedUntil: timestamp('locked_until', { withTimezone: true }),
});
