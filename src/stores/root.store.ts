import { inject, type InjectionKey } from 'vue';

import { AdminApi } from '../services/admin-api.ts';
import type { Permission } from '../services/permissions.ts';
import { StorageService } from '../services/storage.service.ts';
import { AdminStore } from './admin.store.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { RegistrationStore } from './registration.store.ts';
import { TranslationStore } from './translation.store.ts';
import { VisitStore } from './visit.store.ts';

declare global {
	var rootStore: RootStore;
}

export class RootStore {
	readonly storage = new StorageService();

	readonly admin: AdminStore;
	readonly guest: GuestStore;
	readonly registration: RegistrationStore;
	readonly session: MarketSessionStore;
	readonly visit: VisitStore;
	readonly translations = new TranslationStore(this);
	private getAccessToken: (() => Promise<string>) | null = null;
	private readPermissions: (() => Promise<Permission[]>) | null = null;

	constructor() {
		this.guest = new GuestStore({ storage: this.storage });
		this.registration = new RegistrationStore(this.guest, { storage: this.storage });
		this.session = new MarketSessionStore({ requestHeaders: () => this.requestHeaders() });
		this.visit = new VisitStore();
		this.admin = new AdminStore(this.session, {
			api: new AdminApi({ requestHeaders: () => this.requestHeaders() }),
			readPermissions: () => this.readPermissions?.() ?? Promise.resolve([]),
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

export const rootStoreKey: InjectionKey<RootStore> = Symbol('RootStore');

/**
 * Reads the application store. The local fallback keeps isolated component tests and Storybook
 * stories useful without making each one reproduce the application bootstrap.
 */
export function useRootStore(): RootStore {
	return inject(rootStoreKey, null) ?? new RootStore();
}
