export enum StorageKey {
	GUEST_DEVICE_TOKEN = 'bay-compassion.guest-device-token',
	GUEST_IDENTITY = 'bay-compassion.guest-identity',
	/** Last-entered household composition, kept purely to prefill the lottery entry form — never
	 *  sent to the server as part of identity. */
	GUEST_HOUSEHOLD = 'bay-compassion.guest-household',
	LOCALE = 'bay-compassion.locale',
	RETURNING_VISITOR = 'bay-compassion.returning-visitor',
}

interface StorageKeyMap {
	[StorageKey.GUEST_DEVICE_TOKEN]: string;
	[StorageKey.GUEST_IDENTITY]: unknown;
	[StorageKey.GUEST_HOUSEHOLD]: unknown;
	[StorageKey.LOCALE]: string;
	[StorageKey.RETURNING_VISITOR]: boolean;
}

export class StorageService {
	get<K extends StorageKey>(key: K): StorageKeyMap[K] | null;
	get(key: string): unknown;
	// oxlint-disable-next-line typescript/no-redundant-type-constituents
	get<K extends StorageKey>(key: K | string): StorageKeyMap[K] | unknown | null {
		const item = localStorage.getItem(key);

		if (!item) {
			return null;
		}

		try {
			const json = JSON.parse(item);

			return json as StorageKeyMap[K];
		} catch {
			return null;
		}
	}

	set<K extends StorageKey>(key: K, value: StorageKeyMap[K]): void {
		localStorage.setItem(key, JSON.stringify(value));
	}

	remove<K extends StorageKey>(key: K): void {
		localStorage.removeItem(key);
	}

	clear(): void {
		localStorage.clear();
	}
}
