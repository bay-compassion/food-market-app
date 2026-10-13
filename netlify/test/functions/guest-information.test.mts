import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler from '../../routes/guests/guest-information.mjs';

function request(method: string, options: { body?: unknown } = {}) {
	return new Request('https://example.com/api/guest-information', {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
});

describe('guest-information handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('GET'));

		expect(response.status).toBe(405);
	});
});

describe('guest-information handler POST', () => {
	it('returns 400 for an invalid submission before any database check', async () => {
		const response = await handler(request('POST', { body: { firstName: '' } }));

		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('creates a new guest without creating a visit', async () => {
		queueResult([{ id: 'guest-1' }]);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					phone: '555-123-4567',
					locale: 'en',
					deviceToken: null,
				},
			}),
		);

		expect(response.status).toBe(201);

		await expect(response.json()).resolves.toMatchObject({ guestId: 'guest-1' });
		expect(db.select).not.toHaveBeenCalled();
	});

	it('updates the existing guest for an identified device', async () => {
		const deviceToken = 'device-token-from-this-browser-12345678901234567890';

		queueResult([{ id: 'guest-1', firstName: 'Old' }]);
		queueResult([{ id: 'guest-1', firstName: 'Renewed' }]);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Renewed',
					lastName: 'Guest',
					phone: '555-123-4567',
					locale: 'en',
					deviceToken,
				},
			}),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ guestId: 'guest-1' });
	});

	describe('pronunciation', () => {
		const deviceToken = 'device-token-from-this-browser-12345678901234567890';
		const identity = {
			firstName: 'Siobhan',
			lastName: 'Guest',
			phone: '555-123-4567',
			locale: 'en',
			deviceToken,
		};

		/** What the update of the existing guest wrote. */
		function updatedFields() {
			const update = vi.mocked(db.update).mock.results[0]!.value as {
				set: ReturnType<typeof vi.fn>;
			};

			return update.set.mock.calls[0]![0] as Record<string, unknown>;
		}

		it('leaves the stored pronunciation alone when the phone did not send one', async () => {
			// Arrange
			queueResult([{ id: 'guest-1' }]);
			queueResult([{ id: 'guest-1' }]);

			// Act
			await handler(request('POST', { body: identity }));

			// Assert
			expect(updatedFields().pronunciation).toBeUndefined();
		});

		it('saves a trimmed pronunciation the guest wrote', async () => {
			// Arrange
			queueResult([{ id: 'guest-1' }]);
			queueResult([{ id: 'guest-1' }]);

			// Act
			await handler(request('POST', { body: { ...identity, pronunciation: '  shi-VAWN ' } }));

			// Assert
			expect(updatedFields().pronunciation).toBe('shi-VAWN');
		});

		it('clears the pronunciation when the guest emptied it', async () => {
			// Arrange
			queueResult([{ id: 'guest-1' }]);
			queueResult([{ id: 'guest-1' }]);

			// Act
			await handler(request('POST', { body: { ...identity, pronunciation: '' } }));

			// Assert
			expect(updatedFields().pronunciation).toBeNull();
		});

		it('rejects a pronunciation longer than the field allows', async () => {
			// Act
			const response = await handler(
				request('POST', { body: { ...identity, pronunciation: 'a'.repeat(101) } }),
			);

			// Assert
			expect(response.status).toBe(400);
		});
	});
});
