import { randomUUID } from 'node:crypto';

import { getDeployStore } from '@netlify/blobs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { guests, visits } from '../../db/schema.mjs';
import { isLocale, type Locale } from '../../src/locales.js';
import type { NameTagPrintJob } from '../../src/services/print-jobs.js';
import { tracedQuery } from '../lib/sentry.mjs';

/** The few operations the queue needs from a key-value store, so tests can hand it a map. */
export interface PrintQueueStorage {
	keys(prefix: string): Promise<string[]>;
	read(key: string): Promise<unknown>;
	write(key: string, value: unknown): Promise<void>;
	remove(key: string): Promise<void>;
}

export type PrintQueueOptions = {
	storage: PrintQueueStorage;
	now?: () => number;
};

const jobPrefix = 'jobs/';
const heartbeatKey = 'station/heartbeat';

/**
 * A tag older than this is dropped rather than printed: the guest has long since walked off, and a
 * station that comes back online should not print a backlog for a line that has moved on.
 */
const jobLifetimeMs = 5 * 60_000;

/** A station that has not checked in for this long is offline. Several of its 2-second polls. */
const stationTimeoutMs = 15_000;

const jobSchema = z.object({
	id: z.string(),
	visitId: z.string(),
	firstName: z.string(),
	lastInitial: z.string(),
	queuePosition: z.number().int().nullable(),
	locale: z.custom<Locale>(isLocale),
	requestedAt: z.iso.datetime(),
});
const heartbeatSchema = z.object({ at: z.number().finite() });

/**
 * Name tags sent from volunteers' phones, waiting for the print station to print them.
 *
 * Built for one station per market. The station reads every waiting tag, prints them in order, and
 * removes each only after printing it — so a station that crashes mid-print prints a tag twice
 * rather than losing one, and a duplicate sticker is the cheaper failure. There is no claiming:
 * two stations would both print every tag.
 */
export class PrintQueue {
	private readonly storage: PrintQueueStorage;
	private readonly now: () => number;

	constructor(options: PrintQueueOptions) {
		this.storage = options.storage;
		this.now = options.now ?? (() => Date.now());
	}

	/** Queues a tag. The id leads with the time so waiting tags list in the order they were sent. */
	async enqueue(tag: Omit<NameTagPrintJob, 'id' | 'requestedAt'>): Promise<NameTagPrintJob> {
		const now = this.now();
		const job: NameTagPrintJob = {
			...tag,
			id: `${String(now).padStart(15, '0')}-${randomUUID()}`,
			requestedAt: new Date(now).toISOString(),
		};

		await this.storage.write(`${jobPrefix}${job.id}`, job);

		return job;
	}

	/** Every tag still worth printing, oldest first. Expired or unreadable entries are cleared. */
	async pending(): Promise<NameTagPrintJob[]> {
		const keys = (await this.storage.keys(jobPrefix)).sort();
		const jobs: NameTagPrintJob[] = [];

		for (const key of keys) {
			const job = jobSchema.safeParse(await this.storage.read(key));

			if (job.success && this.now() - Date.parse(job.data.requestedAt) < jobLifetimeMs) {
				jobs.push(job.data);
			} else {
				await this.storage.remove(key);
			}
		}

		return jobs;
	}

	/** Removes a printed tag. Removing one already gone is not an error. */
	async complete(id: string): Promise<void> {
		await this.storage.remove(`${jobPrefix}${id}`);
	}

	/** Records that the station just checked in. */
	async heartbeat(): Promise<void> {
		await this.storage.write(heartbeatKey, { at: this.now() });
	}

	/** Whether a station has checked in recently enough to print a tag sent now. */
	async isStationOnline(): Promise<boolean> {
		const heartbeat = heartbeatSchema.safeParse(await this.storage.read(heartbeatKey));

		return heartbeat.success && this.now() - heartbeat.data.at < stationTimeoutMs;
	}
}

/**
 * The deploy's Blobs store. Strongly consistent, as the market overview cache is, so the station
 * sees a tag the moment it is sent rather than when a CDN copy expires.
 */
function blobStorage(): PrintQueueStorage {
	const store = getDeployStore({ name: 'name-tag-printing', consistency: 'strong' });

	return {
		keys: async (prefix) => (await store.list({ prefix })).blobs.map(({ key }) => key),
		read: (key) => store.get(key, { type: 'json' }),
		write: async (key, value) => {
			await store.setJSON(key, value);
		},
		remove: (key) => store.delete(key),
	};
}

export function printQueue(): PrintQueue {
	return new PrintQueue({ storage: blobStorage() });
}

/**
 * What a visit's name tag needs, read from the database rather than taken from the phone: the
 * first name, the last name's initial, the place in line, and the language. Null for no such visit.
 */
export async function nameTagFor(
	visitId: string,
): Promise<Omit<NameTagPrintJob, 'id' | 'requestedAt'> | null> {
	const [row] = await tracedQuery('print_queue.read_tag', () =>
		db
			.select({
				firstName: guests.firstName,
				lastName: guests.lastName,
				queuePosition: visits.queuePosition,
				locale: guests.locale,
			})
			.from(visits)
			.innerJoin(guests, eq(guests.id, visits.guestId))
			.where(eq(visits.id, visitId))
			.limit(1),
	);

	if (!row) {
		return null;
	}

	return {
		visitId,
		firstName: row.firstName.trim(),
		lastInitial: row.lastName.trim().charAt(0).toLocaleUpperCase(),
		queuePosition: row.queuePosition,
		locale: isLocale(row.locale) ? row.locale : 'en',
	};
}
