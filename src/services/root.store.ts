import { inject, type InjectionKey } from 'vue';

import { TranslationStore } from '@/stores/translation.store.ts';

import { RegistrationStore } from '../stores/registration.store.ts';
import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { StorageService } from './storage.service.ts';

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

		globalThis.rootStore = this;
	}

	setAccessTokenProvider(getAccessToken: () => Promise<string>): void {
		this.getAccessToken = getAccessToken;
	}

	start(): void {
		void this.guest.initialize();
		this.session.startPolling();
	}

	[Symbol.dispose](): void {
		this.session[Symbol.dispose]();
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
