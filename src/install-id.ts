import { INSTALL_ID_HEADER, isInstallId } from './services/install-id.ts';
import { StorageKey, StorageService } from './services/storage.service.ts';

/**
 * This browser's install ID (see `src/services/install-id.ts`), read from storage or created on the
 * first launch.
 *
 * It has to be ready synchronously: `sentry.ts` puts it on Sentry's initial scope while its module
 * is still being evaluated, before anything else has run. So nothing here is allowed to throw —
 * blocked storage gets an ID that lasts for this page load, rather than an app that never renders.
 */
export function readInstallId(
	storage: () => Pick<StorageService, 'get' | 'set'> = () => new StorageService(),
	random: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = crypto,
): string {
	try {
		const store = storage();
		const saved = store.get(StorageKey.INSTALL_ID);

		if (isInstallId(saved)) {
			return saved;
		}

		const created = randomUuid(random);

		store.set(StorageKey.INSTALL_ID, created);

		return created;
	} catch {
		return randomUuid(random);
	}
}

let current: string | undefined;

/** The install ID, read once per page load so Sentry and the `fetch` wrapper agree on it. */
export function installId(): string {
	return (current ??= readInstallId());
}

/**
 * Returns a `fetch` that sends the install ID with every request to this app's own API, so the
 * server can put it on the request's log lines and its Sentry transaction.
 *
 * Installed over `window.fetch` once, from `main.tsx`, rather than threaded through each call site:
 * those live in `src/services/`, which the server shares and so may not read browser storage.
 *
 * Only same-origin `/api/` requests are touched. Auth0, LaunchDarkly, and Sentry's own ingest go
 * through `fetch` too, and a custom header would both hand them the ID and turn each request into
 * a CORS preflight they may refuse.
 */
export function withInstallIdHeader(
	request: typeof fetch,
	id: string,
	origin: string,
): typeof fetch {
	return (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input, origin);

		if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
			return request(input, init);
		}

		// `init.headers` replaces a `Request`'s headers wholesale, so both are merged before adding.
		const headers = new Headers(input instanceof Request ? input.headers : undefined);

		new Headers(init?.headers).forEach((value, name) => headers.set(name, value));

		if (!headers.has(INSTALL_ID_HEADER)) {
			headers.set(INSTALL_ID_HEADER, id);
		}

		return request(input, { ...init, headers });
	};
}

/**
 * A version 4 UUID. `crypto.randomUUID` only exists in a secure context, so a build opened over
 * plain HTTP on a LAN address builds one from `getRandomValues`, which is available everywhere.
 */
function randomUuid(random: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>) {
	if (typeof random.randomUUID === 'function') {
		return random.randomUUID();
	}

	const bytes = random.getRandomValues(new Uint8Array(16));

	// RFC 9562: the version nibble is 4, and the variant's top bits are 10.
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20),
	].join('-');
}
