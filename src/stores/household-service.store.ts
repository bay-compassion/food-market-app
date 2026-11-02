import { makeAutoObservable, runInAction } from 'mobx';

import type { AdminApi } from '../services/admin-api';
import type {
	HouseholdServiceEntry,
	HouseholdServiceSubmission,
} from '../services/household-service';

export type HouseholdServiceApi = Pick<
	AdminApi,
	'householdServiceEntries' | 'recordHouseholdService' | 'correctHouseholdService'
>;

function pendingStorage(): Storage | null {
	try {
		return globalThis.sessionStorage ?? null;
	} catch {
		return null;
	}
}

/** Session-local recording. An uncertain save retains its operation id until a successful retry. */
export class HouseholdServiceStore {
	entries: HouseholdServiceEntry[] = [];
	busy = false;
	loaded = false;
	error: 'load' | 'save' | 'correct' | null = null;
	pending: HouseholdServiceSubmission | null = null;

	constructor(
		readonly marketEventId: string,
		private readonly api: HouseholdServiceApi,
		private readonly storage = pendingStorage(),
	) {
		try {
			const saved = JSON.parse(
				this.storage?.getItem(this.storageKey) ?? 'null',
			) as HouseholdServiceSubmission | null;

			if (
				saved?.marketEventId === marketEventId &&
				typeof saved.id === 'string' &&
				Number.isInteger(saved.householdSize) &&
				saved.householdSize >= 1 &&
				saved.householdSize <= 30
			) {
				this.pending = saved;
			}
		} catch {
			/* Storage may be unavailable; keep retry protection in memory. */
		}
		makeAutoObservable(this, {}, { autoBind: true });
	}

	private get storageKey() {
		return `bay-compassion.household-service-pending.${this.marketEventId}`;
	}

	get households() {
		return this.entries.filter((entry) => !entry.voidedAt).length;
	}
	get members() {
		return this.entries.reduce(
			(total, entry) => total + (entry.voidedAt ? 0 : entry.householdSize),
			0,
		);
	}

	async load() {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.error = null;

		try {
			const entries = await this.api.householdServiceEntries(this.marketEventId);

			runInAction(() => {
				this.entries = entries;
				this.loaded = true;
			});
		} catch {
			runInAction(() => {
				this.error = 'load';
			});
		} finally {
			runInAction(() => {
				this.busy = false;
			});
		}
	}

	async record(householdSize: number): Promise<boolean> {
		if (
			this.busy ||
			!this.loaded ||
			(!this.pending &&
				(!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 30))
		) {
			return false;
		}
		this.pending ??= { id: crypto.randomUUID(), marketEventId: this.marketEventId, householdSize };

		try {
			this.storage?.setItem(this.storageKey, JSON.stringify(this.pending));
		} catch {
			/* In-memory retry still works. */
		}
		this.busy = true;
		this.error = null;

		try {
			const entry = await this.api.recordHouseholdService(this.pending);

			runInAction(() => {
				this.entries = [entry, ...this.entries.filter((row) => row.id !== entry.id)];
				this.pending = null;

				try {
					this.storage?.removeItem(this.storageKey);
				} catch {
					/* A stale retry is safe on the server. */
				}
			});

			return true;
		} catch {
			runInAction(() => {
				this.error = 'save';
			});

			return false;
		} finally {
			runInAction(() => {
				this.busy = false;
			});
		}
	}

	async correct(
		entry: HouseholdServiceEntry,
		householdSize: number,
		voided: boolean,
	): Promise<boolean> {
		if (this.busy || this.pending) {
			return false;
		}
		this.busy = true;
		this.error = null;

		try {
			const updated = await this.api.correctHouseholdService(entry.id, {
				version: entry.version,
				householdSize,
				voided,
			});

			runInAction(() => {
				this.entries = this.entries.map((row) => (row.id === updated.id ? updated : row));
			});

			return true;
		} catch {
			runInAction(() => {
				this.error = 'correct';
			});

			return false;
		} finally {
			runInAction(() => {
				this.busy = false;
			});
		}
	}
}
