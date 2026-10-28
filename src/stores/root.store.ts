import { reaction, runInAction, type IReactionDisposer } from 'mobx';

import { AdminApi } from '../services/admin-api.ts';
import type { Permission } from '../services/permissions.ts';
import { StorageService } from '../services/storage.service.ts';
import { AdminStore, type AdminStoreOptions } from './admin.store.ts';
import { ConfirmationStore } from './confirmation.store.ts';
import { GuestClaimStore, type GuestClaimStoreOptions } from './guest-claim.store.ts';
import { GuestTourStore } from './guest-tour.store.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore, type MarketSessionStoreOptions } from './market-session.store.ts';
import { NotificationStore } from './notification.store.ts';
import { PwaInstallStore, type PwaInstallStoreOptions } from './pwa-install.store';
import { RegistrationStore } from './registration.store.ts';
import { TranslationStore, type Language } from './translation.store.ts';
import { VisitStore, type VisitStoreOptions } from './visit.store.ts';
import { WorkersStore } from './workers.store.ts';

export type RootStoreOptions = {
	storage?: StorageService;
	browserStorage?: Storage;
	previewName?: string;
	installation?: PwaInstallStoreOptions;
	admin?: AdminStoreOptions;
	workers?: { fetch?: typeof fetch };
	session?: Pick<MarketSessionStoreOptions, 'fetch'>;
	claim?: GuestClaimStoreOptions;
	visit?: VisitStoreOptions;
};

declare global {
	var rootStore: RootStore;
}

export class RootStore {
	readonly storage: StorageService;

	readonly admin: AdminStore;
	readonly workers: WorkersStore;
	readonly claim: GuestClaimStore;
	readonly confirmation: ConfirmationStore;
	readonly guest: GuestStore;
	readonly notifications: NotificationStore;
	readonly installation: PwaInstallStore;
	readonly registration: RegistrationStore;
	readonly session: MarketSessionStore;
	readonly tour: GuestTourStore;
	readonly visit: VisitStore;
	readonly translations: TranslationStore;
	readonly previewName: string | undefined;
	private readonly forgetInstallHandoff: IReactionDisposer;
	private getAccessToken: (() => Promise<string>) | null = null;
	private readPermissions: (() => Promise<Permission[]>) | null = null;

	constructor(options: RootStoreOptions = {}) {
		this.previewName = options.previewName;
		this.translations = new TranslationStore(options.browserStorage);
		this.confirmation = new ConfirmationStore();
		this.notifications = new NotificationStore();
		this.storage = options.storage ?? new StorageService(options.browserStorage);
		this.installation = new PwaInstallStore(this.storage, {
			...options.installation,
			disabled: !!options.previewName || options.installation?.disabled,
		});
		this.guest = new GuestStore({ storage: this.storage });
		this.guest.notificationsDisabled = !!options.previewName;
		this.registration = new RegistrationStore(this.guest, { storage: this.storage });
		this.tour = new GuestTourStore(this.storage);
		this.session = new MarketSessionStore({
			requestHeaders: () => this.requestHeaders(),
			...options.session,
		});
		this.visit = new VisitStore(this, { storage: options.browserStorage, ...options.visit });
		this.claim = new GuestClaimStore(this.guest, this.visit, options.claim);
		this.admin = new AdminStore(this.session, {
			api: new AdminApi({ requestHeaders: () => this.requestHeaders() }),
			readPermissions: () => this.readPermissions?.() ?? Promise.resolve([]),
			notifications: this.notifications,
			...options.admin,
		});

		this.workers = new WorkersStore(this, options.workers?.fetch);
		// A pending install must not resurrect a forgotten or replaced guest on a shared phone.
		this.forgetInstallHandoff = reaction(
			() => this.guest.deviceId,
			() => this.installation.clearHandoff(),
		);
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

	/**
	 * A guest's language choice, from either the first-visit introduction or the app bar. Any
	 * explicit choice retires the introduction, so it never stays up after its one question is
	 * answered elsewhere.
	 */
	chooseLanguage(language: Language): void {
		runInAction(() => {
			this.translations.setLanguage(language);
			this.guest.markAsReturningVisitor();
		});
	}

	/**
	 * Picks the guided tour up again for a guest who chose a language but left before finishing or
	 * skipping it. A first-time guest is offered it by their language choice instead, once the
	 * introduction has folded away (see `use-language-choice.ts`).
	 */
	resumeTour(): void {
		if (this.guest.isReturningVisitor) {
			this.tour.offer();
		}
	}

	start(): void {
		this.installation.start();
		void this.guest.initialize();
		void this.visit.refresh();
		this.session.startPolling();
	}

	[Symbol.dispose](): void {
		this.forgetInstallHandoff();
		this.installation[Symbol.dispose]();
		this.session[Symbol.dispose]();
		this.visit[Symbol.dispose]();
	}
}
