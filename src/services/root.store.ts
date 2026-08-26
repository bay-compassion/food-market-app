import { inject, type InjectionKey } from 'vue';

import { GuestStore } from './guest.store.ts';
import { MarketSessionStore } from './market-session.store.ts';
import { StorageService } from './storage.service.ts';

export class RootStore {
	readonly guest: GuestStore;
	readonly session: MarketSessionStore;
	private getAccessToken: (() => Promise<string>) | null = null;

	constructor() {
		const storage = new StorageService();

		this.guest = new GuestStore({ storage });
		this.session = new MarketSessionStore({
			requestHeaders: async () => {
				if (!this.getAccessToken) {
					return new Headers();
				}

				return { Authorization: `Bearer ${await this.getAccessToken()}` };
			},
		});
	}

	setAccessTokenProvider(getAccessToken: () => Promise<string>): void {
		this.getAccessToken = getAccessToken;
	}

	start(): void {
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
