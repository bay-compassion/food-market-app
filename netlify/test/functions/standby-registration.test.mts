import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

vi.mock('../../services/guestRegistration.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../services/guestRegistration.mjs')>()),
	registerGuest: vi.fn(),
}));
vi.mock('../../services/standby.mjs', () => ({ issueStandbyTicket: vi.fn() }));

import handler from '../../functions/registration.mjs';
import { registerGuest } from '../../services/guestRegistration.mjs';
import { issueStandbyTicket } from '../../services/standby.mjs';

const ticket = 'a-standby-ticket-from-the-ipad-code-1234567890';
const marketEventId = '7a0c6f2e-4b4d-4e0e-9d55-2f6a1c3b9e10';

/** The body the `/standby` page sends: the guest's own form, the session, and the ticket. */
const body = {
	firstName: 'Ari',
	lastName: 'Guest',
	ageRange: '18-29',
	householdSize: 2,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '555-123-4567',
	locale: 'en',
	deviceToken: null,
	answers: {},
	source: 'self',
	marketEventId,
	ticket,
};

function post(path: string, payload: unknown) {
	return new Request(`https://example.com${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

afterEach(() => {
	vi.mocked(registerGuest).mockReset();
	vi.mocked(issueStandbyTicket).mockReset();
});

describe('standby registration routes', () => {
	it('registers the page’s form with the ticket it carries', async () => {
		// Arrange
		vi.mocked(registerGuest).mockResolvedValue({
			ok: true,
			status: 201,
			body: { id: 'visit-1', status: 'waiting' } as never,
		});

		// Act
		const response = await handler(post('/api/standby-registration', body));

		// Assert
		expect(response.status).toBe(201);
		expect(registerGuest).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'self', marketEventId, firstName: 'Ari' }),
			expect.anything(),
			{ standbyTicket: ticket },
		);
		await expect(response.json()).resolves.toMatchObject({ marketEventId, status: 'waiting' });
	});

	it('answers a ticket request with the ticket and the S number it holds', async () => {
		// Arrange
		vi.mocked(issueStandbyTicket).mockResolvedValue({
			ok: true,
			ticket,
			standbyNumber: 4,
			marketEventId,
		});

		// Act
		const response = await handler(post('/api/standby-ticket', { code: `${marketEventId}.sig` }));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ticket, standbyNumber: 4, marketEventId });
	});

	it('passes a refusal through as its status', async () => {
		// Arrange
		vi.mocked(issueStandbyTicket).mockResolvedValue({
			ok: false,
			status: 409,
			error: 'Standby isn’t open yet.',
		});

		// Act
		const response = await handler(post('/api/standby-ticket', { code: `${marketEventId}.sig` }));

		// Assert
		expect(response.status).toBe(409);
	});
});
