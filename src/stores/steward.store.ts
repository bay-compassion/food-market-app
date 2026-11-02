import { makeAutoObservable, runInAction } from 'mobx';

import { StewardRoster } from '../models/steward-roster.ts';
import type { Permission } from '../services/permissions.ts';
import type {
	OddsChangeSubmission,
	StewardApi,
	StewardLedgerResponse,
} from '../services/steward-api.ts';

type StewardStoreOptions = {
	api: Pick<StewardApi, 'readLedger' | 'saveOdds'>;
	readPermissions: () => Promise<Permission[]>;
};

/**
 * The state of the `/steward` area. It stays out of `RootStore` on purpose: this module and the
 * words in it load only with that lazily loaded route, never with the guest or admin downloads.
 */
export class StewardStore {
	ledger: StewardLedgerResponse | null = null;
	permissions: Permission[] | null = null;
	loadError: string | null = null;
	saving = false;
	selectedId: string | null = null;

	private readonly api: StewardStoreOptions['api'];
	private readonly readPermissions: StewardStoreOptions['readPermissions'];

	constructor(options: StewardStoreOptions) {
		this.api = options.api;
		this.readPermissions = options.readPermissions;
		makeAutoObservable<this, 'api' | 'readPermissions'>(
			this,
			{ api: false, readPermissions: false },
			{ autoBind: true },
		);
	}

	get canRead(): boolean {
		return this.permissions?.includes('read:stewardship') ?? false;
	}

	get canManage(): boolean {
		return this.permissions?.includes('manage:stewardship') ?? false;
	}

	get roster(): StewardRoster | null {
		return this.ledger && new StewardRoster(this.ledger);
	}

	get selected() {
		return this.roster?.person(this.selectedId) ?? null;
	}

	select(id: string | null): void {
		this.selectedId = id;
	}

	async load(): Promise<void> {
		try {
			const permissions = await this.readPermissions();

			runInAction(() => {
				this.permissions = permissions;
			});

			if (!permissions.includes('read:stewardship')) {
				return;
			}

			const ledger = await this.api.readLedger();

			runInAction(() => {
				this.ledger = ledger;
				this.loadError = null;
			});
		} catch (cause) {
			runInAction(() => {
				this.permissions ??= [];
				this.loadError = cause instanceof Error ? cause.message : 'This could not be loaded.';
			});
		}
	}

	/** Saves a change, then rereads the ledger. Throws so the sheet stays open to try again. */
	async saveOdds(personId: string, change: OddsChangeSubmission): Promise<void> {
		this.saving = true;

		try {
			await this.api.saveOdds(personId, change);
			const ledger = await this.api.readLedger();

			runInAction(() => {
				this.ledger = ledger;
			});
		} finally {
			runInAction(() => {
				this.saving = false;
			});
		}
	}
}
