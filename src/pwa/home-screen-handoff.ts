import { StorageKey } from '../services/storage.service';

export const homeScreenStartPath = '/pwa-start';
const cookieName = 'bay-compassion.pwa-handoff';
const lifetimeMs = 60 * 60_000;
const visitTokenKey = 'bay-compassion.visit-token';
const keys = [
	StorageKey.GUEST_DEVICE_TOKEN,
	StorageKey.GUEST_IDENTITY,
	StorageKey.GUEST_HOUSEHOLD,
	StorageKey.LOCALE,
	StorageKey.RETURNING_VISITOR,
	StorageKey.GUEST_TOUR_SEEN,
	visitTokenKey,
] as const;

type Snapshot = { expiresAt: number; values: Record<string, string> };

/**
 * iOS 17.2+ copies cookies into a newly installed app, but never localStorage. Carry only the
 * guest's existing browser data, briefly, on the launch path — never in a URL or an API request.
 * The guest opens the new icon to finish; its copy is consumed before stores are constructed.
 */
export class HomeScreenHandoff {
	constructor(
		private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
		private readonly document: Pick<Document, 'cookie'> = window.document,
		private readonly secure = window.location.protocol === 'https:',
		private readonly now: () => number = Date.now,
	) {}

	prepare(): boolean {
		try {
			const values: Record<string, string> = {};

			for (const key of keys) {
				const value = this.storage.getItem(key);

				if (value !== null) {
					values[key] = value;
				}
			}

			if (!values[StorageKey.GUEST_DEVICE_TOKEN] || !values[visitTokenKey]) {
				return false;
			}

			const encoded = encodeURIComponent(
				JSON.stringify({ expiresAt: this.now() + lifetimeMs, values } satisfies Snapshot),
			);

			// Leave room for the cookie's name and attributes inside the browser's 4 KB limit.
			if (encoded.length > 3500) {
				return false;
			}

			this.document.cookie = `${cookieName}=${encoded}; Path=${homeScreenStartPath}; Max-Age=${lifetimeMs / 1000}; SameSite=Strict${this.secure ? '; Secure' : ''}`;

			return true;
		} catch {
			return false;
		}
	}

	restore(): void {
		try {
			const encoded = this.document.cookie
				.split('; ')
				.find((cookie) => cookie.startsWith(`${cookieName}=`))
				?.slice(cookieName.length + 1);

			if (!encoded) {
				return;
			}

			this.clear();

			const snapshot: unknown = JSON.parse(decodeURIComponent(encoded));

			if (!this.isSnapshot(snapshot)) {
				return;
			}

			// A returning app must never replace another guest or a newer visit with an old copy.
			if (
				this.storage.getItem(StorageKey.GUEST_DEVICE_TOKEN) ||
				this.storage.getItem(StorageKey.GUEST_IDENTITY) ||
				this.storage.getItem(visitTokenKey)
			) {
				return;
			}

			const written: (typeof keys)[number][] = [];
			const previous = new Map(keys.map((key) => [key, this.storage.getItem(key)]));

			try {
				for (const key of keys) {
					const value = snapshot.values[key];

					if (value !== undefined) {
						this.storage.setItem(key, value);
						written.push(key);
					}
				}
			} catch {
				for (const key of written) {
					const value = previous.get(key);

					if (value == null) {
						this.storage.removeItem(key);
					} else {
						this.storage.setItem(key, value);
					}
				}
			}
		} catch {
			// Invalid, expired, or unavailable browser storage leaves the ordinary guest flow intact.
		}
	}

	clear(): void {
		try {
			this.document.cookie = `${cookieName}=; Path=${homeScreenStartPath}; Max-Age=0; SameSite=Strict${this.secure ? '; Secure' : ''}`;
		} catch {
			// Cookies may be blocked; forgetting information must still succeed.
		}
	}

	private isSnapshot(value: unknown): value is Snapshot {
		if (typeof value !== 'object' || value === null) {
			return false;
		}
		const snapshot = value as Partial<Snapshot>;

		return (
			typeof snapshot.expiresAt === 'number' &&
			snapshot.expiresAt > this.now() &&
			snapshot.expiresAt <= this.now() + lifetimeMs &&
			typeof snapshot.values === 'object' &&
			snapshot.values !== null &&
			keys.every(
				(key) => snapshot.values?.[key] === undefined || typeof snapshot.values[key] === 'string',
			) &&
			!!snapshot.values[StorageKey.GUEST_DEVICE_TOKEN] &&
			!!snapshot.values[visitTokenKey]
		);
	}
}
