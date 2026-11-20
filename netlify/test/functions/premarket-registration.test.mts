import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../dbStub.mjs';

const { premarketSessionFor, registerGuest } = vi.hoisted(() => ({
	premarketSessionFor: vi.fn(),
	registerGuest: vi.fn(),
}));

vi.mock('../../../db/index.mjs', () => ({ db }));

vi.mock('../../services/premarket-code.mjs', () => ({ premarketSessionFor }));
vi.mock('../../services/guestRegistration.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../services/guestRegistration.mjs')>()),
	registerGuest,
}));
vi.mock('../../services/visit-events.mjs', () => ({ guestActor: { kind: 'guest' } }));

import handler from '../../routes/guests/premarket-registration.mjs';

const code = 'printed-premarket-code-1234';

function request(path: string, method: string, body?: unknown) {
	return new Request(`https://example.com${path}`, {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

const volunteer = {
	code,
	firstName: 'Ari',
	lastName: 'Volunteer',
	ageRange: '18-29',
	householdSize: 2,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '555-123-4567',
	locale: 'en',
	deviceToken: null,
};

afterEach(() => {
	vi.clearAllMocks();
});

describe('premarket status handler', () => {
	it('says whether the code’s premarket is open', async () => {
		// Arrange
		premarketSessionFor.mockResolvedValue({ marketEventId: 'event-1', open: true });

		// Act
		const response = await handler(request('/api/premarket-status', 'POST', { code }));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ open: true });
	});

	it('answers an unknown or replaced code with one generic error', async () => {
		// Arrange
		premarketSessionFor.mockResolvedValue(null);

		// Act
		const response = await handler(request('/api/premarket-status', 'POST', { code }));

		// Assert
		expect(response.status).toBe(410);
	});

	it('rejects a malformed code without looking it up', async () => {
		// Act
		const response = await handler(request('/api/premarket-status', 'POST', { code: 'short' }));

		// Assert
		expect(response.status).toBe(400);
		expect(premarketSessionFor).not.toHaveBeenCalled();
	});
});

describe('premarket registration handler', () => {
	it('registers for the code’s session, whatever session the request names', async () => {
		// Arrange
		premarketSessionFor.mockResolvedValue({ marketEventId: 'event-1', open: true });
		registerGuest.mockResolvedValue({
			ok: true,
			status: 201,
			body: { id: 'visit-1', guestId: 'guest-1', status: 'served' },
		});

		// Act
		const response = await handler(
			request('/api/premarket-registration', 'POST', {
				...volunteer,
				marketEventId: 'event-from-the-client',
				source: 'admin',
				admission: 'queue',
			}),
		);

		// Assert
		expect(response.status).toBe(201);
		const [submission, actor, options] = registerGuest.mock.calls[0]!;

		expect(submission).toMatchObject({ source: 'self', marketEventId: 'event-1' });
		expect(actor).toEqual({ kind: 'guest' });
		expect(options).toEqual({ premarket: true });
	});

	it('refuses a replaced code before validating the form', async () => {
		// Arrange
		premarketSessionFor.mockResolvedValue(null);

		// Act
		const response = await handler(request('/api/premarket-registration', 'POST', volunteer));

		// Assert
		expect(response.status).toBe(410);
		expect(registerGuest).not.toHaveBeenCalled();
	});

	it('reports a form’s problems by field', async () => {
		// Arrange
		premarketSessionFor.mockResolvedValue({ marketEventId: 'event-1', open: true });

		// Act
		const response = await handler(
			request('/api/premarket-registration', 'POST', { ...volunteer, householdSize: null }),
		);

		// Assert
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			fields: { householdSize: 'required' },
		});
	});
});
