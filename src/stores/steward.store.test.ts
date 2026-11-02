import { describe, expect, it, vi } from 'vitest';

import type { Permission } from '../services/permissions.ts';
import type { StewardLedgerResponse } from '../services/steward-api.ts';
import { StewardStore } from './steward.store.ts';

const ledger: StewardLedgerResponse = { draws: [], upcoming: null, people: [], changes: [] };

function store(permissions: Permission[] = ['read:stewardship']) {
	const api = {
		readLedger: vi.fn().mockResolvedValue(ledger),
		saveOdds: vi.fn().mockResolvedValue(undefined),
	};

	return {
		api,
		steward: new StewardStore({ api, readPermissions: () => Promise.resolve(permissions) }),
	};
}

describe('StewardStore', () => {
	it('asks the server for nothing without read:stewardship', async () => {
		// Arrange
		const { api, steward } = store(['run:queue']);

		// Act
		await steward.load();

		// Assert
		expect(steward.canRead).toBe(false);
		expect(api.readLedger).not.toHaveBeenCalled();
	});

	it('loads the ledger for a steward', async () => {
		// Arrange
		const { steward } = store();

		// Act
		await steward.load();

		// Assert
		expect(steward.canRead).toBe(true);
		expect(steward.canManage).toBe(false);
		expect(steward.roster).not.toBeNull();
	});

	it('reports a failed load', async () => {
		// Arrange
		const { api, steward } = store();

		api.readLedger.mockRejectedValue(new Error('Nope.'));

		// Act
		await steward.load();

		// Assert
		expect(steward.loadError).toBe('Nope.');
	});

	it('rereads the ledger after a saved change', async () => {
		// Arrange
		const { api, steward } = store();
		const change = { weight: 2, scope: 'open', reason: 'Staff judgment' } as const;

		// Act
		await steward.saveOdds('guest-1', change);

		// Assert
		expect(api.saveOdds).toHaveBeenCalledWith('guest-1', change);
		expect(api.readLedger).toHaveBeenCalledOnce();
		expect(steward.saving).toBe(false);
	});

	it('leaves a failed save for the sheet to report', async () => {
		// Arrange
		const { api, steward } = store();

		api.saveOdds.mockRejectedValue(new Error('Refused.'));

		// Act
		const saving = steward.saveOdds('guest-1', {
			weight: 2,
			scope: 'open',
			reason: 'Staff judgment',
		});

		// Assert
		await expect(saving).rejects.toThrow('Refused.');
		expect(steward.saving).toBe(false);
	});
});
