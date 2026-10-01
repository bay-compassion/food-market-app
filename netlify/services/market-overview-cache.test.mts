import { describe, expect, it, vi } from 'vitest';

vi.mock('./marketSession.mjs', () => ({ marketOverview: vi.fn() }));

import { MarketOverviewCache, type MarketOverviewStorage } from './market-overview-cache.mjs';

const empty = { event: null, questions: [], counts: {} };
const now = Date.parse('2026-09-30T18:00:00Z');
const event = {
	id: 'event-1',
	status: 'scheduled',
	capacity: 50,
	registrationOpensAt: new Date(now + 60_000).toISOString(),
	registrationClosesAt: new Date(now + 120_000).toISOString(),
};

class MemoryStorage implements MarketOverviewStorage {
	entry: { data: unknown; etag: string } | null = null;
	writes = 0;
	async read() {
		return this.entry;
	}
	async write(data: unknown, condition: { onlyIfNew: true } | { onlyIfMatch: string }) {
		if (
			'onlyIfNew' in condition ? this.entry !== null : this.entry?.etag !== condition.onlyIfMatch
		) {
			return { modified: false };
		}
		this.writes += 1;
		this.entry = { data, etag: String(this.writes) };

		return { modified: true, etag: this.entry.etag };
	}
}

function setup(overview: unknown = empty) {
	const storage = new MemoryStorage();
	let time = now;
	const load = vi.fn(async () => overview);
	const warn = vi.fn();
	const wait = vi.fn(async (ms: number) => {
		time += ms;
	});
	const options = { storage: () => storage, load, now: () => time, wait, warn };

	return {
		storage,
		load,
		warn,
		wait,
		options,
		cache: new MarketOverviewCache(options),
		advance: (ms: number) => {
			time += ms;
		},
	};
}

describe('MarketOverviewCache', () => {
	it('caches an empty market and refreshes exactly at expiry', async () => {
		const { cache, storage, load, advance } = setup();

		await cache.get();
		advance(4_999);
		const cached = await new MarketOverviewCache({
			storage: () => storage,
			load,
			now: () => now + 4_999,
		}).get();

		expect(cached).toEqual(empty);
		expect(load).toHaveBeenCalledTimes(1);

		advance(1);
		await cache.get();

		expect(load).toHaveBeenCalledTimes(2);
	});

	it.each([
		null,
		{ version: 2 },
		{ version: 1, kind: 'snapshot', expiresAt: now + 5_000, overview: {} },
	])('replaces malformed entries: %j', async (data) => {
		const { storage, cache, load, warn } = setup();

		storage.entry = { data, etag: 'bad' };

		await expect(cache.get()).resolves.toEqual(empty);

		expect(load).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('validate', expect.anything());
	});

	it.each([
		{ status: 'scheduled', registrationOpensAt: new Date(now + 1_000).toISOString() },
		{ status: 'registration_open', registrationClosesAt: new Date(now + 1_000).toISOString() },
		{ status: 'registration_closed', registrationGraceEndsAt: new Date(now + 1_000).toISOString() },
		{
			status: 'lottery_pending',
			registrationGraceEndsAt: new Date(now + 1_000).toISOString(),
			lotteryDelayMinutes: 0,
		},
		{
			status: 'service_started',
			registrationOpensAt: new Date(now - 59_000).toISOString(),
			autoCloseAfterMinutes: 1,
		},
	])('expires at the $status deadline', async (timing) => {
		const { cache, storage, advance, load } = setup({ ...empty, event: { ...event, ...timing } });

		await cache.get();

		expect(storage.entry?.data).toMatchObject({ expiresAt: now + 1_000 });

		advance(1_000);
		await cache.get();

		expect(load).toHaveBeenCalledTimes(2);
	});

	it('coalesces requests within an instance', async () => {
		const { cache, load } = setup();

		await Promise.all([cache.get(), cache.get(), cache.get()]);

		expect(load).toHaveBeenCalledTimes(1);
	});

	it('lets a competing instance read the winner snapshot after losing the claim', async () => {
		const { cache, options, load, wait } = setup();
		const other = new MarketOverviewCache(options);

		await Promise.all([cache.get(), other.get()]);

		expect(load).toHaveBeenCalledTimes(1);
		expect(wait).toHaveBeenCalled();
	});

	it('recovers an expired lease', async () => {
		const { cache, storage, load } = setup();

		storage.entry = { etag: 'abandoned', data: { version: 1, kind: 'lease', until: now } };

		await cache.get();

		expect(load).toHaveBeenCalledTimes(1);
		expect(storage.entry?.data).toMatchObject({ kind: 'snapshot' });
	});

	it('falls back after waiting one second without overwriting another lease', async () => {
		const { cache, storage, load, wait } = setup();

		storage.entry = { etag: 'busy', data: { version: 1, kind: 'lease', until: now + 10_000 } };

		await cache.get();

		expect(wait).toHaveBeenCalledTimes(10);
		expect(load).toHaveBeenCalledTimes(1);
		expect(storage.writes).toBe(0);
	});

	it('does not publish a load that has outlived its freshness window', async () => {
		const { cache, advance, load, storage } = setup();

		load.mockImplementation(async () => {
			advance(5_000);

			return empty;
		});

		await cache.get();

		expect(storage.writes).toBe(1);
		expect(storage.entry?.data).toMatchObject({ kind: 'lease' });
	});

	it('cannot replace a snapshot published after its lease was superseded', async () => {
		const { cache, load, storage } = setup();
		const newer = { ...empty, counts: { waiting: 3 } };

		load.mockImplementation(async () => {
			storage.entry = {
				etag: 'newer',
				data: { version: 1, kind: 'snapshot', expiresAt: now + 5_000, overview: newer },
			};

			return empty;
		});

		await cache.get();

		expect(storage.entry?.etag).toBe('newer');
		expect(storage.entry?.data).toMatchObject({ overview: newer });
	});

	it.each(['read', 'claim', 'publish'] as const)(
		'falls back safely on %s failure',
		async (operation) => {
			const { cache, storage, load, warn } = setup();
			const error = new Error('Blob unavailable');

			if (operation === 'read') {
				vi.spyOn(storage, 'read').mockRejectedValue(error);
			} else {
				const write = storage.write.bind(storage);

				vi.spyOn(storage, 'write').mockImplementation(async (data, condition) => {
					if (operation === 'claim' || !('onlyIfNew' in condition)) {
						throw error;
					}

					return write(data, condition);
				});
			}

			await expect(cache.get()).resolves.toEqual(empty);

			expect(load).toHaveBeenCalledTimes(1);
			expect(warn).toHaveBeenCalledWith(operation, error);
		},
	);

	it('falls back if opening the store fails', async () => {
		const { options, load, warn } = setup();
		const error = new Error('Missing context');
		const cache = new MarketOverviewCache({
			...options,
			storage: () => {
				throw error;
			},
		});

		await expect(cache.get()).resolves.toEqual(empty);

		expect(load).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('open', error);
	});

	it('propagates database failures without retrying them and clears local pending state', async () => {
		const { cache, load, advance } = setup();

		load.mockRejectedValueOnce(new Error('Database unavailable'));

		await expect(cache.get()).rejects.toThrow('Database unavailable');

		expect(load).toHaveBeenCalledTimes(1);

		advance(10_000);
		await expect(cache.get()).resolves.toEqual(empty);
	});
});

describe('cache storage safeguards', () => {
	it('can serve a fresh snapshot without an ETag but never refreshes it without a condition', async () => {
		const { options, load, warn, advance } = setup();
		const write = vi.fn();
		const storage: MarketOverviewStorage = {
			read: async () => ({
				data: { version: 1, kind: 'snapshot', expiresAt: now + 5_000, overview: empty },
			}),
			write,
		};
		const cache = new MarketOverviewCache({ ...options, storage: () => storage });

		await cache.get();

		expect(load).not.toHaveBeenCalled();

		advance(5_000);
		await cache.get();

		expect(load).toHaveBeenCalledTimes(1);
		expect(write).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith('claim', expect.any(Error));
	});

	it('falls back when a successful claim has no ETag', async () => {
		const { options, load, warn } = setup();
		const write = vi.fn(async () => ({ modified: true }));
		const storage: MarketOverviewStorage = {
			read: async () => null,
			write,
		};
		const cache = new MarketOverviewCache({ ...options, storage: () => storage });

		await cache.get();

		expect(load).toHaveBeenCalledTimes(1);
		expect(write).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('claim', expect.any(Error));
	});

	it('includes storage latency in the contention budget', async () => {
		const { cache, storage, advance, wait, load } = setup();

		storage.entry = { etag: 'busy', data: { version: 1, kind: 'lease', until: now + 10_000 } };
		const read = storage.read.bind(storage);

		vi.spyOn(storage, 'read').mockImplementation(async () => {
			advance(400);

			return read();
		});

		await cache.get();

		expect(wait).toHaveBeenCalledTimes(2);
		expect(load).toHaveBeenCalledTimes(1);
	});
});
