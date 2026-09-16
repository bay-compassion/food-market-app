import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

import type { AgeRange } from '../src/services/ageRanges.js';
import type { SessionStatus } from '../src/services/sessionStateMachine.js';
import type { VisitStatus } from '../src/services/visitStateMachine.js';

/** Where a market happens. Its time zone is what every local date and time there is read in. */
export const marketLocations = pgTable('market_locations', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	/** An IANA time zone name, such as `America/Los_Angeles`. */
	timeZone: text('time_zone').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A weekly schedule. It occurs on the weekday of `startsOn`, and only its next occurrence is ever
 * a session — see `RecurrencePattern` in `src/models/recurrence-pattern.ts`.
 */
export const recurrencePatterns = pgTable(
	'recurrence_patterns',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		locationId: uuid('location_id')
			.notNull()
			.references(() => marketLocations.id),
		startsOn: date('starts_on').notNull(),
		/** Local wall-clock time at the location, with no time zone. */
		registrationOpensAt: time('registration_opens_at').notNull(),
		registrationDurationMinutes: integer('registration_duration_minutes').notNull().default(60),
		capacity: integer('capacity').notNull(),
		/** Minutes after the grace deadline the lottery draws on its own; null draws by hand. */
		lotteryDelayMinutes: integer('lottery_delay_minutes'),
		/** Minutes after registration opens the session ends on its own; null never does. */
		autoCloseAfterMinutes: integer('auto_close_after_minutes').default(720),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	// One pattern per location for now; dropping this index is the change for several.
	(table) => [uniqueIndex('recurrence_patterns_location_idx').on(table.locationId)],
);

export const recurrencePatternQuestions = pgTable('recurrence_pattern_questions', {
	id: uuid('id').defaultRandom().primaryKey(),
	recurrencePatternId: uuid('recurrence_pattern_id')
		.notNull()
		.references(() => recurrencePatterns.id, { onDelete: 'cascade' }),
	prompt: text('prompt').notNull(),
	type: text('type').notNull().default('text'),
	required: boolean('required').notNull().default(false),
	position: integer('position').notNull().default(0),
});

export const marketEvents = pgTable(
	'market_events',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		locationId: uuid('location_id')
			.notNull()
			.references(() => marketLocations.id),
		/** The pattern that created this session; null for a one-off. */
		recurrencePatternId: uuid('recurrence_pattern_id').references(() => recurrencePatterns.id, {
			onDelete: 'set null',
		}),
		registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }).notNull(),
		registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }).notNull(),
		/** The brief late-arrival window after the guest UI closes registration. */
		registrationGraceEndsAt: timestamp('registration_grace_ends_at', { withTimezone: true }),
		capacity: integer('capacity').notNull(),
		/** Minutes after the grace deadline the lottery draws on its own; null draws by hand. */
		lotteryDelayMinutes: integer('lottery_delay_minutes'),
		/** Minutes after registration opens the session ends on its own; null never does. */
		autoCloseAfterMinutes: integer('auto_close_after_minutes'),
		status: text('status').$type<SessionStatus>().notNull().default('scheduled'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		// At most one unfinished session per location — what "the current session" relies on.
		uniqueIndex('market_events_one_unfinished_per_location_idx')
			.on(table.locationId)
			.where(sql`status <> 'ended'`),
	],
);

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

export const guests = pgTable(
	'guests',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		/** Still present for the pending backfill-then-drop follow-up; superseded by `ageRange`. */
		age: integer('age'),
		phone: text('phone').notNull(),
		normalizedPhone: text('normalized_phone').notNull(),
		/** Synthetic guest records must never reach external notification providers. */
		fake: boolean('fake').notNull().default(false),
		/** Hash of the browser-local credential. Null for admin-created and earlier guests. */
		deviceTokenHash: text('device_token_hash'),
		locale: text('locale').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		// `age_range`, `household_size`, `children_count`, and `seniors_count` still exist as physical
		// columns pending a later backfill-then-drop follow-up — household composition now lives only
		// on `visits`, snapshotted per visit rather than carried on the guest's identity.
	},
	(table) => [uniqueIndex('guests_device_token_hash_idx').on(table.deviceTokenHash)],
);

/**
 * A single-use code a worker shows as a QR code so a guest can adopt their record on their own
 * phone — a guest just added by hand, or, with a manager's override, any guest at all. Only the
 * token's hash is stored, a guest has at most one outstanding code, and the row is deleted the
 * moment it is redeemed.
 */
export const guestClaims = pgTable(
	'guest_claims',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		guestId: uuid('guest_id')
			.notNull()
			.references(() => guests.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		/**
		 * The device credential this code may replace — null when the guest has none. Redeeming only
		 * succeeds while the guest still holds exactly this one, so a code cannot overwrite a phone that
		 * adopted the record after it was issued. Non-null only for a manager's override.
		 */
		replacesDeviceTokenHash: text('replaces_device_token_hash'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('guest_claims_guest_idx').on(table.guestId),
		uniqueIndex('guest_claims_token_hash_idx').on(table.tokenHash),
	],
);

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
	ageRange: text('age_range').$type<AgeRange>(),
	householdSize: integer('household_size').notNull(),
	/** Snapshot of the guest's counts at the time of this visit, for accurate per-visit reporting. */
	childrenCount: integer('children_count').notNull().default(0),
	seniorsCount: integer('seniors_count').notNull().default(0),
	/** Snapshot used to reconcile renewed or duplicate guest records during later analysis. */
	normalizedPhone: text('normalized_phone'),
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
		/** Which transport delivers this row: 'push' via web-push, 'sms' via Twilio. */
		channel: text('channel').$type<'push' | 'sms'>().notNull().default('push'),
		title: text('title'),
		body: text('body'),
		status: text('status').notNull().default('pending'),
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error'),
		claimedAt: timestamp('claimed_at', { withTimezone: true }),
		claimedBy: text('claimed_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		sentAt: timestamp('sent_at', { withTimezone: true }),
	},
	(table) => [
		uniqueIndex('notification_deliveries_visit_dedupe_channel_idx').on(
			table.visitId,
			table.dedupeKey,
			table.channel,
		),
		index('notification_deliveries_status_idx').on(table.status, table.createdAt),
		index('notification_deliveries_claim_idx').on(
			table.status,
			table.channel,
			table.claimedAt,
			table.createdAt,
		),
	],
);

export const smsSubscriptions = pgTable(
	'sms_subscriptions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		guestId: uuid('guest_id')
			.notNull()
			.references(() => guests.id, { onDelete: 'cascade' }),
		consentedAt: timestamp('consented_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex('sms_subscriptions_guest_idx').on(table.guestId)],
);

/**
 * The Twilio sender that received a STOP from a guest. Twilio blocks both the Messaging Service
 * and that sender, so a later website re-consent must clear both records through the Consent API.
 */
export const smsOptOuts = pgTable(
	'sms_opt_outs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		guestId: uuid('guest_id')
			.notNull()
			.references(() => guests.id, { onDelete: 'cascade' }),
		senderPhone: text('sender_phone').notNull(),
		optedOutAt: timestamp('opted_out_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex('sms_opt_outs_guest_idx').on(table.guestId)],
);
