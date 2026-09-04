import { AdminApi } from '../services/admin-api.ts';
import type { Permission } from '../services/permissions.ts';
import { StorageService } from '../services/storage.service.ts';
import { AdminStore, type AdminStoreOptions } from './admin.store.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { RegistrationStore } from './registration.store.ts';
import { TranslationStore } from './translation.store.ts';
import { VisitStore, type VisitStoreOptions } from './visit.store.ts';

export type RootStoreOptions = {
	storage?: StorageService;
	browserStorage?: Storage;
	previewName?: string;
	admin?: AdminStoreOptions;
	visit?: VisitStoreOptions;
};

declare global {
	var rootStore: RootStore;
}

export class RootStore {
	readonly storage: StorageService;

	readonly admin: AdminStore;
	readonly guest: GuestStore;
	readonly registration: RegistrationStore;
	readonly session: MarketSessionStore;
	readonly visit: VisitStore;
	readonly translations: TranslationStore;
	readonly previewName: string | undefined;
	private getAccessToken: (() => Promise<string>) | null = null;
	private readPermissions: (() => Promise<Permission[]>) | null = null;

	constructor(options: RootStoreOptions = {}) {
		this.previewName = options.previewName;
		this.translations = new TranslationStore(options.browserStorage);
		this.storage = options.storage ?? new StorageService(options.browserStorage);
		this.guest = new GuestStore({ storage: this.storage });
		this.guest.notificationsDisabled = !!options.previewName;
		this.registration = new RegistrationStore(this.guest, { storage: this.storage });
		this.session = new MarketSessionStore({ requestHeaders: () => this.requestHeaders() });
		this.visit = new VisitStore(this, { storage: options.browserStorage, ...options.visit });
		this.admin = new AdminStore(this.session, {
			api: new AdminApi({ requestHeaders: () => this.requestHeaders() }),
			readPermissions: () => this.readPermissions?.() ?? Promise.resolve([]),
			...options.admin,
		});

		globalThis.rootStore = this;
	}

	setAccessTokenProvider(getAccessToken: () => Promise<string>): void {
		this.getAccessToken = getAccessToken;
	}

	/**
	 * Supplies the permissions the signed-in worker holds. Injected rather than read here so the
	 * store graph — which every component test and story constructs — stays clear of the Auth0 SDK.
	 */
	setPermissionReader(readPermissions: () => Promise<Permission[]>): void {
		this.readPermissions = readPermissions;
	}

	private async requestHeaders(): Promise<HeadersInit> {
		if (!this.getAccessToken) {
			return new Headers();
		}

		return { Authorization: `Bearer ${await this.getAccessToken()}` };
	}

	start(): void {
		void this.guest.initialize();
		void this.visit.refresh();
		this.session.startPolling();
	}

	[Symbol.dispose](): void {
		this.session[Symbol.dispose]();
		this.visit[Symbol.dispose]();
	}
}
