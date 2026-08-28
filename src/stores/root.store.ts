import { inject, type InjectionKey } from 'vue';

import { StorageService } from '../services/storage.service.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { RegistrationStore } from './registration.store.ts';
import { TranslationStore } from './translation.store.ts';
import { VisitStore } from './visit.store.ts';

declare global {
	interface Window {
		rootStore: RootStore;
	}
}

export class RootStore {
	readonly storage = new StorageService();

	readonly guest: GuestStore;
	readonly registration: RegistrationStore;
	readonly session: MarketSessionStore;
	readonly visit: VisitStore;
	readonly translations = new TranslationStore(this);
	private getAccessToken: (() => Promise<string>) | null = null;

	constructor() {
		this.guest = new GuestStore({ storage: this.storage });
		this.registration = new RegistrationStore(this.guest, { storage: this.storage });
		this.session = new MarketSessionStore({
			requestHeaders: async () => {
				if (!this.getAccessToken) {
					return new Headers();
				}

				return { Authorization: `Bearer ${await this.getAccessToken()}` };
			},
		});
		this.visit = new VisitStore();

		globalThis.rootStore = this;
	}

	setAccessTokenProvider(getAccessToken: () => Promise<string>): void {
		this.getAccessToken = getAccessToken;
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
