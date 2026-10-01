import { getDeployStore } from '@netlify/blobs';
import { z } from 'zod';

import { SessionTimeline } from '../../src/models/session-timeline.js';
import { SessionStatusEnum } from '../../src/services/sessionStateMachine.js';
import { getLogger } from '../lib/logging.mjs';
import { marketOverview } from './marketSession.mjs';

const key = 'overview-v1';
const lifetimeMs = 5_000;
const leaseMs = 10_000;
const retryMs = 100;
const retries = 10;
const date = z.iso.datetime();
const eventSchema = z.looseObject({
	id: z.string(),
	status: z.enum(SessionStatusEnum),
	registrationOpensAt: date,
	registrationClosesAt: date,
	registrationGraceEndsAt: date.nullish(),
	lotteryDelayMinutes: z.number().nullish(),
	autoCloseAfterMinutes: z.number().nullish(),
	capacity: z.number(),
});
const overviewSchema = z.looseObject({
	event: eventSchema.nullable(),
	questions: z.array(
		z.looseObject({
			id: z.string(),
			prompt: z.string(),
			type: z.string(),
			required: z.boolean(),
		}),
	),
	counts: z.record(z.string(), z.number()),
});
const entrySchema = z.discriminatedUnion('kind', [
	z.object({ version: z.literal(1), kind: z.literal('lease'), until: z.number().finite() }),
	z.object({
		version: z.literal(1),
		kind: z.literal('snapshot'),
		expiresAt: z.number().finite(),
		overview: overviewSchema,
	}),
]);

type Overview = z.infer<typeof overviewSchema>;
type Condition = { onlyIfNew: true } | { onlyIfMatch: string };
export interface MarketOverviewStorage {
	read(): Promise<{ data: unknown; etag?: string } | null>;
	write(data: unknown, condition: Condition): Promise<{ modified: boolean; etag?: string }>;
}
export type MarketOverviewCacheOptions = {
	storage: () => MarketOverviewStorage;
	load: () => Promise<unknown>;
	now?: () => number;
	wait?: (ms: number) => Promise<void>;
	warn?: (operation: string, cause: unknown) => void;
};

/** A disposable read cache: database reads and transitions remain authoritative. */
export class MarketOverviewCache {
	private pending: Promise<unknown> | null = null;
	private readonly now: () => number;
	private readonly wait: (ms: number) => Promise<void>;
	private readonly warn: (operation: string, cause: unknown) => void;

	constructor(private readonly options: MarketOverviewCacheOptions) {
		this.now = options.now ?? (() => Date.now());
		this.wait = options.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
		this.warn =
			options.warn ??
			((operation, err) => {
				getLogger().warn({
					message: 'market_overview.cache_failed',
					operation,
					err,
					errorMessage: err instanceof Error ? err.message : 'Unknown cache error',
				});
			});
	}

	get(): Promise<unknown> {
		this.pending ??= this.readOrRefresh().finally(() => {
			this.pending = null;
		});

		return this.pending;
	}

	private async readOrRefresh(): Promise<unknown> {
		let storage: MarketOverviewStorage;

		try {
			storage = this.options.storage();
		} catch (cause) {
			this.warn('open', cause);

			return this.options.load();
		}

		const waitUntil = this.now() + retries * retryMs;

		for (let attempt = 0; attempt <= retries; attempt += 1) {
			let current: Awaited<ReturnType<MarketOverviewStorage['read']>>;

			try {
				current = await storage.read();
			} catch (cause) {
				this.warn('read', cause);

				return this.options.load();
			}
			const parsed = entrySchema.safeParse(current?.data);
			const entry = parsed.success ? parsed.data : null;

			if (current && !parsed.success) {
				this.warn('validate', parsed.error);
			}
			const now = this.now();

			if (entry?.kind === 'snapshot' && entry.expiresAt > now) {
				return entry.overview;
			}

			if (!(entry?.kind === 'lease' && entry.until > now)) {
				// A fresh read needs no ETag, but refreshing without one cannot be race-safe.
				if (current && !current.etag) {
					this.warn('claim', new Error('Market snapshot has no ETag.'));

					return this.options.load();
				}
				let claim: Awaited<ReturnType<MarketOverviewStorage['write']>>;

				try {
					claim = await storage.write(
						{ version: 1, kind: 'lease', until: now + leaseMs },
						current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
					);
				} catch (cause) {
					this.warn('claim', cause);

					return this.options.load();
				}

				if (claim.modified && claim.etag) {
					return this.refresh(storage, claim.etag, now);
				}

				if (claim.modified) {
					this.warn('claim', new Error('Market lease write returned no ETag.'));

					return this.options.load();
				}
			}

			const remaining = waitUntil - this.now();

			if (remaining <= 0) {
				break;
			}

			if (attempt < retries) {
				await this.wait(Math.min(retryMs, remaining));
			}
		}

		return this.options.load();
	}

	private async refresh(storage: MarketOverviewStorage, etag: string, startedAt: number) {
		// Keep loader failures outside the storage catch: do not retry a failed database action.
		const overview = await this.options.load();

		try {
			const wire = overviewSchema.parse(JSON.parse(JSON.stringify(overview)));
			const expiresAt = this.expiry(wire, startedAt);

			if (expiresAt > this.now()) {
				const published = await storage.write(
					{ version: 1, kind: 'snapshot', overview: wire, expiresAt },
					{ onlyIfMatch: etag },
				);

				if (published.modified && !published.etag) {
					throw new Error('Market snapshot write returned no ETag.');
				}
			}
		} catch (cause) {
			this.warn('publish', cause);
		}

		return overview;
	}

	private expiry(overview: Overview, startedAt: number): number {
		const deadlines = [startedAt + lifetimeMs];
		const event = overview.event;

		if (!event) {
			return deadlines[0]!;
		}

		const timeline = new SessionTimeline({
			...event,
			registrationOpensAt: new Date(event.registrationOpensAt),
			registrationClosesAt: new Date(event.registrationClosesAt),
			registrationGraceEndsAt: event.registrationGraceEndsAt
				? new Date(event.registrationGraceEndsAt)
				: null,
		});

		if (event.status === 'scheduled') {
			deadlines.push(Date.parse(event.registrationOpensAt));
		}

		if (event.status === 'scheduled' || event.status === 'registration_open') {
			deadlines.push(Date.parse(event.registrationClosesAt));
		}

		if (event.status === 'registration_closed') {
			deadlines.push(timeline.graceDeadline.valueOf());
		}

		if (event.status === 'lottery_pending' && timeline.lotteryDrawsAt) {
			deadlines.push(timeline.lotteryDrawsAt.valueOf());
		}

		if (event.status !== 'ended' && timeline.autoClosesAt) {
			deadlines.push(timeline.autoClosesAt.valueOf());
		}

		return Math.min(...deadlines);
	}
}

export const guestMarketOverview = new MarketOverviewCache({
	load: marketOverview,
	storage: () => {
		const store = getDeployStore({ name: 'market-polling', consistency: 'strong' });

		return {
			async read() {
				const result = await store.getWithMetadata(key, { type: 'json' });

				if (!result) {
					return null;
				}

				if (result.etag) {
					return { data: result.data as unknown, etag: result.etag };
				}

				// The local Blobs server omits GET ETags but exposes them through listing.
				// Read the body again AFTER listing: an intervening write then makes our
				// conditional claim fail, rather than pairing an old body with a newer ETag.
				const listing = await store.list({ prefix: key });
				const etag = listing.blobs.find((blob) => blob.key === key)?.etag;

				if (!etag) {
					return { data: result.data as unknown };
				}

				const current = await store.getWithMetadata(key, { type: 'json' });

				return current ? { data: current.data as unknown, etag: current.etag ?? etag } : null;
			},
			write: (data, condition) => store.setJSON(key, data, condition),
		};
	},
});
