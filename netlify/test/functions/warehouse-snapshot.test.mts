import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import { snapshotWarehouse } from '../../functions/warehouse-snapshot.mjs';

afterEach(() => {
	resetDbStub();
});

describe('snapshotWarehouse', () => {
	it('does nothing until snapshots are turned on', async () => {
		// Arrange
		const env = {};

		// Act
		await snapshotWarehouse(env);

		// Assert
		expect(db.select).not.toHaveBeenCalled();
	});
});
