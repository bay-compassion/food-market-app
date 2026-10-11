import { describe, expect, it, vi } from 'vitest';

import { readInstallId, withInstallIdHeader } from './install-id.ts';
import { isInstallId } from './services/install-id.ts';
import { StorageKey, StorageService } from './services/storage.service.ts';

const id = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const origin = 'https://market.example';

describe('readInstallId', () => {
	it('creates an ID on first launch and keeps it', () => {
		// Arrange
		const storage = new StorageService();

		// Act
		const first = readInstallId(() => storage);
		const second = readInstallId(() => storage);

		// Assert
		expect(isInstallId(first)).toBe(true);
		expect(second).toBe(first);
		expect(storage.get(StorageKey.INSTALL_ID)).toBe(first);
	});

	it('replaces a stored value that is not an install ID', () => {
		// Arrange
		const storage = new StorageService();

		storage.set(StorageKey.INSTALL_ID, 'not-a-uuid');

		// Act
		const result = readInstallId(() => storage);

		// Assert
		expect(isInstallId(result)).toBe(true);
		expect(storage.get(StorageKey.INSTALL_ID)).toBe(result);
	});

	it('builds a version 4 UUID where randomUUID is missing, as on plain HTTP', () => {
		// Arrange
		const random = { getRandomValues: crypto.getRandomValues.bind(crypto) };

		// Act
		const result = readInstallId(() => new StorageService(), random);

		// Assert
		expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('still returns an ID when storage is blocked', () => {
		// Arrange
		const blocked = () => {
			throw new DOMException('Access is denied', 'SecurityError');
		};

		// Act
		const result = readInstallId(blocked);

		// Assert
		expect(isInstallId(result)).toBe(true);
	});
});

describe('withInstallIdHeader', () => {
	function sentHeaders(request: ReturnType<typeof vi.fn>) {
		const init = request.mock.calls[0]?.[1] as RequestInit | undefined;

		return new Headers(init?.headers);
	}

	it.each(['/api/visit', `${origin}/api/visit`, new URL('/api/visit', origin)])(
		'adds the header to an API request addressed as %s',
		async (input) => {
			// Arrange
			const request = vi.fn(() => Promise.resolve(new Response()));
			const wrapped = withInstallIdHeader(request, id, origin);

			// Act
			await wrapped(input);

			// Assert
			expect(sentHeaders(request).get('X-Install-Id')).toBe(id);
		},
	);

	it.each(['https://auth.example/oauth/token', '/assets/logo.svg', `${origin}/apish`])(
		'leaves %s untouched',
		async (input) => {
			// Arrange
			const request = vi.fn(() => Promise.resolve(new Response()));
			const init = { headers: { Accept: 'application/json' } };
			const wrapped = withInstallIdHeader(request, id, origin);

			// Act
			await wrapped(input, init);

			// Assert
			expect(request).toHaveBeenCalledWith(input, init);
		},
	);

	it.each([
		['a plain record', { Authorization: 'Bearer token' }],
		['a Headers object', new Headers({ Authorization: 'Bearer token' })],
		['a list of pairs', [['Authorization', 'Bearer token']] as [string, string][]],
	])('keeps the caller’s headers given as %s', async (_label, headers) => {
		// Arrange
		const request = vi.fn(() => Promise.resolve(new Response()));
		const wrapped = withInstallIdHeader(request, id, origin);

		// Act
		await wrapped('/api/notification-status', { headers });

		// Assert
		const sent = sentHeaders(request);

		expect(sent.get('Authorization')).toBe('Bearer token');
		expect(sent.get('X-Install-Id')).toBe(id);
	});

	it('keeps the headers of a Request passed as the input', async () => {
		// Arrange
		const request = vi.fn(() => Promise.resolve(new Response()));
		const wrapped = withInstallIdHeader(request, id, origin);
		const input = new Request(`${origin}/api/visit`, {
			headers: { Authorization: 'Bearer token' },
		});

		// Act
		await wrapped(input);

		// Assert
		const sent = sentHeaders(request);

		expect(sent.get('Authorization')).toBe('Bearer token');
		expect(sent.get('X-Install-Id')).toBe(id);
	});

	it('does not overwrite an install ID the caller already set', async () => {
		// Arrange
		const request = vi.fn(() => Promise.resolve(new Response()));
		const wrapped = withInstallIdHeader(request, id, origin);
		const other = '00000000-0000-4000-8000-000000000000';

		// Act
		await wrapped('/api/visit', { headers: { 'X-Install-Id': other } });

		// Assert
		expect(sentHeaders(request).get('X-Install-Id')).toBe(other);
	});
});
