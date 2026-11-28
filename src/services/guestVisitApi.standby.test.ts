import { afterEach, describe, expect, it, vi } from 'vitest';

import { submitGuestRegistration } from './guestVisitApi.ts';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('submitGuestRegistration onto standby', () => {
	it('posts to the standby endpoint, sending the ticket as `ticket`', async () => {
		// Arrange
		const fetch = vi.fn().mockResolvedValue(Response.json({ id: 'visit-1', status: 'waiting' }));

		vi.stubGlobal('fetch', fetch);

		// Act
		await submitGuestRegistration({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
			locale: 'en',
			marketEventId: 'event-1',
			answers: {},
			source: 'self',
			deviceToken: null,
			standbyTicket: 'held-ticket',
		} as never);

		// Assert
		const [url, init] = fetch.mock.calls[0]!;
		const sent = JSON.parse(init.body as string);

		expect(url).toBe('/api/standby-registration');
		expect(sent).toMatchObject({ ticket: 'held-ticket', marketEventId: 'event-1' });
		expect(sent).not.toHaveProperty('standbyTicket');
	});
});
