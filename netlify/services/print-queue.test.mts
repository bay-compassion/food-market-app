import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.mjs', () => ({ db: {} }));
vi.mock('@netlify/blobs', () => ({ getDeployStore: vi.fn() }));

import { PrintQueue, type PrintQueueStorage } from './print-queue.mjs';

/** A map standing in for the Blobs store, with a clock the test moves by hand. */
function queueWith(start = Date.parse('2026-10-05T18:00:00.000Z')) {
	const entries = new Map<string, unknown>();
	const clock = { now: start };
	const storage: PrintQueueStorage = {
		keys: async (prefix) => [...entries.keys()].filter((key) => key.startsWith(prefix)),
		read: async (key) => entries.get(key) ?? null,
		write: async (key, value) => void entries.set(key, value),
		remove: async (key) => void entries.delete(key),
	};

	return { queue: new PrintQueue({ storage, now: () => clock.now }), entries, clock };
}

const maria = {
	visitId: 'visit-1',
	firstName: 'Maria',
	lastInitial: 'S',
	queuePosition: 14,
	locale: 'es' as const,
};

describe('PrintQueue', () => {
	it('hands back waiting tags in the order they were sent', async () => {
		// Arrange
		const { queue, clock } = queueWith();

		await queue.enqueue(maria);
		clock.now += 1_000;
		await queue.enqueue({ ...maria, visitId: 'visit-2', firstName: 'Linh' });

		// Act
		const pending = await queue.pending();

		// Assert
		expect(pending.map((job) => job.firstName)).toEqual(['Maria', 'Linh']);
		expect(pending[0]).toMatchObject({ ...maria, requestedAt: '2026-10-05T18:00:00.000Z' });
	});

	it('removes a printed tag, and shrugs off removing it twice', async () => {
		// Arrange
		const { queue } = queueWith();
		const job = await queue.enqueue(maria);

		// Act
		await queue.complete(job.id);
		await queue.complete(job.id);

		// Assert
		expect(await queue.pending()).toEqual([]);
	});

	it('drops a tag that waited too long to be worth printing', async () => {
		// Arrange
		const { queue, entries, clock } = queueWith();

		await queue.enqueue(maria);
		clock.now += 5 * 60_000;

		// Act
		const pending = await queue.pending();

		// Assert
		expect(pending).toEqual([]);
		expect(entries.size).toBe(0);
	});

	it('clears an entry it cannot read rather than failing on it', async () => {
		// Arrange
		const { queue, entries } = queueWith();

		entries.set('jobs/garbage', { nope: true });

		// Act
		const pending = await queue.pending();

		// Assert
		expect(pending).toEqual([]);
		expect(entries.has('jobs/garbage')).toBe(false);
	});

	it('counts the station online only while it keeps checking in', async () => {
		// Arrange
		const { queue, clock } = queueWith();
		const neverSeen = await queue.isStationOnline();

		await queue.heartbeat();
		const justSeen = await queue.isStationOnline();

		// Act
		clock.now += 15_000;
		const goneQuiet = await queue.isStationOnline();

		// Assert
		expect([neverSeen, justSeen, goneQuiet]).toEqual([false, true, false]);
	});
});
