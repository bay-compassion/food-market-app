import { afterEach, describe, expect, it, vi } from 'vitest';

import { DrawLedger } from '../../src/models/draw-ledger.js';
import { GuestReconciliation } from '../../src/models/guest-reconciliation.js';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./draw-ledger.mjs', () => ({
	readGuestIdentities: vi.fn(),
	readDrawLedger: vi.fn(),
}));

import { readDrawLedger, readGuestIdentities, type Reader } from './draw-ledger.mjs';
import { settleDrawOdds } from './draw-odds.mjs';

const draw = { id: 'event-2', registrationOpensAt: new Date('2026-11-07T17:30:00Z') };
const identity = (guestId: string, firstName: string, phone: string) => ({
	guestId,
	firstName,
	lastName: 'Reyes',
	phones: [phone],
});

function given(ledger: DrawLedger = new DrawLedger([], [])) {
	vi.mocked(readGuestIdentities).mockResolvedValue([
		identity('old-record', 'Ana', '5105550123'),
		identity('new-record', 'Ana', '5105550123'),
		identity('other', 'Bo', '5105550199'),
	]);
	vi.mocked(readDrawLedger).mockResolvedValue(ledger);
}

afterEach(() => {
	resetDbStub();
	vi.clearAllMocks();
});

describe('settleDrawOdds', () => {
	it('touches nothing for an empty pool', async () => {
		// Act
		const settled = await settleDrawOdds(db as unknown as Reader, draw, []);

		// Assert
		expect(settled).toEqual([]);
		expect(readGuestIdentities).not.toHaveBeenCalled();
	});

	it('follows the person to a new guest record', async () => {
		// Arrange
		given();
		queueResult([
			{
				guestId: 'old-record',
				weight: 5,
				marketEventId: null,
				endsAt: null,
				createdAt: new Date('2026-10-01T00:00:00Z'),
			},
		]);
		queueResult(undefined); // the bulk update

		// Act
		const settled = await settleDrawOdds(db as unknown as Reader, draw, [
			{ id: 'v1', guestId: 'new-record', lotteryWeight: 1 },
			{ id: 'v2', guestId: 'other', lotteryWeight: 1 },
		]);

		// Assert
		expect(settled.map(({ lotteryWeight }) => lotteryWeight)).toEqual([5, 1]);
	});

	it('keeps the weight a visit already holds when no change covers the draw', async () => {
		// Arrange
		given();
		queueResult([]);
		queueResult(undefined); // the bulk update

		// Act
		const settled = await settleDrawOdds(db as unknown as Reader, draw, [
			{ id: 'v1', guestId: 'other', lotteryWeight: 2 },
		]);

		// Assert
		expect(settled[0]?.lotteryWeight).toBe(2);
	});

	it('never uses the automatic suggestion as the weight', async () => {
		// Arrange
		const person = new GuestReconciliation([identity('other', 'Bo', '5105550199')]).personOf(
			'other',
		);
		const opensAt = new Date('2026-10-01T00:00:00Z');
		const ledger = new DrawLedger(
			[
				{ id: 'a', opensAt },
				{ id: 'b', opensAt },
				{ id: 'c', opensAt },
				{ id: 'd', opensAt },
			],
			['a', 'b', 'c', 'd'].map((drawId) => ({ drawId, personId: person, won: false })),
		);

		given(ledger);
		queueResult([]);
		queueResult(undefined); // the bulk update

		// Act
		const settled = await settleDrawOdds(db as unknown as Reader, draw, [
			{ id: 'v1', guestId: 'other', lotteryWeight: 1 },
		]);

		// Assert
		expect(settled[0]?.lotteryWeight).toBe(1);
	});
});
