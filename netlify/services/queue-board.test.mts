import { PgDialect } from 'drizzle-orm/pg-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./marketSession.mjs', () => ({ getCurrentEvent: vi.fn() }));

import { getCurrentEvent } from './marketSession.mjs';
import { queueBoard } from './queue-board.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(getCurrentEvent).mockReset();
});

describe('queueBoard', () => {
	it('counts only the line as waiting, leaving standby guests out', async () => {
		// Arrange
		vi.mocked(getCurrentEvent).mockResolvedValue(baseEvent({ status: 'service_started' }));
		queueResult([]); // called numbers
		queueResult([{ count: 2 }]); // waiting count
		queueResult([{ queuePosition: null }]); // now calling

		// Act
		const board = await queueBoard();

		// Assert
		const waiting = new PgDialect().sqlToQuery(
			(db.select.mock.results[1]!.value as { where: ReturnType<typeof vi.fn> }).where.mock
				.calls[0]![0],
		);

		expect(board.waitingCount).toBe(2);
		expect(waiting.sql).toContain('"track" = $');
		expect(waiting.params).toEqual(expect.arrayContaining(['waiting', 'lottery']));
	});
});
