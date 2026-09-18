import { AdminApi } from '../services/admin-api.ts';
import type { Permission } from '../services/permissions.ts';
import { StorageService } from '../services/storage.service.ts';
import { AdminStore, type AdminStoreOptions } from './admin.store.ts';
import { ConfirmationStore } from './confirmation.store.ts';
import { GuestClaimStore, type GuestClaimStoreOptions } from './guest-claim.store.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { NotificationStore } from './notification.store.ts';
import { RegistrationStore } from './registration.store.ts';
import { TranslationStore } from './translation.store.ts';
import { VisitStore, type VisitStoreOptions } from './visit.store.ts';

export type RootStoreOptions = {
	storage?: StorageService;
	browserStorage?: Storage;
	previewName?: string;
	admin?: AdminStoreOptions;
	claim?: GuestClaimStoreOptions;
	visit?: VisitStoreOptions;
};

declare global {
	var rootStore: RootStore;
}

export class RootStore {
	readonly storage: StorageService;

	readonly admin: AdminStore;
	readonly claim: GuestClaimStore;
	readonly confirmation: ConfirmationStore;
	readonly guest: GuestStore;
	readonly notifications: NotificationStore;
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
		this.confirmation = new ConfirmationStore();
		this.notifications = new NotificationStore();
		this.storage = options.storage ?? new StorageService(options.browserStorage);
		this.guest = new GuestStore({ storage: this.storage });
		this.guest.notificationsDisabled = !!options.previewName;
		this.registration = new RegistrationStore(this.guest, { storage: this.storage });
		this.session = new MarketSessionStore({ requestHeaders: () => this.requestHeaders() });
		this.visit = new VisitStore(this, { storage: options.browserStorage, ...options.visit });
		this.claim = new GuestClaimStore(this.guest, this.visit, options.claim);
		this.admin = new AdminStore(this.session, {
			api: new AdminApi({ requestHeaders: () => this.requestHeaders() }),
			readPermissions: () => this.readPermissions?.() ?? Promise.resolve([]),
			notifications: this.notifications,
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

	/** Headers that authenticate an admin request, for API clients built outside the store graph. */
	async requestHeaders(): Promise<HeadersInit> {
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
