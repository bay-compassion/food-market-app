import { describe, expect, it, vi } from 'vitest';

import { AdminApi, type ManualGuest } from './admin-api';

/** The parts of a request these tests assert on, normalised so nothing has to be stringified. */
type RecordedCall = { url: string; method: string; headers: Headers; body: string };

function urlOf(input: RequestInfo | URL): string {
	if (typeof input === 'string') {
		return input;
	}

	return input instanceof URL ? input.href : input.url;
}

function apiWith(responder: (url: string, init?: RequestInit) => Response) {
	const calls: RecordedCall[] = [];
	const request = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		const url = urlOf(input);

		calls.push({
			url,
			method: init?.method ?? 'GET',
			headers: new Headers(init?.headers),
			body: typeof init?.body === 'string' ? init.body : '',
		});

		return Promise.resolve(responder(url, init));
	});
	const api = new AdminApi({
		request: request as unknown as typeof fetch,
		requestHeaders: () => ({ Authorization: 'Bearer token' }),
	});

	return { api, calls };
}

const manualGuest: ManualGuest = {
	firstName: 'Ada',
	lastName: 'Lovelace',
	ageRange: '',
	householdSize: 2,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '5105550123',
	queuePlacement: 'end',
	admission: 'queue',
	lotteryWeightTier: 'standard',
};

describe('AdminApi', () => {
	it('sends the auth header on reads', async () => {
		// Arrange
		const { api, calls } = apiWith(() => Response.json([]));

		// Act
		await api.listAllGuests();

		// Assert
		expect(calls[0]!.headers.get('Authorization')).toBe('Bearer token');
	});

	it('narrows the guest list by a trimmed search term', async () => {
		// Arrange
		const { api, calls } = apiWith(() => Response.json([]));

		// Act
		await api.listAllGuests('  ada  ');

		// Assert
		expect(calls[0]!.url).toBe('/api/guests?scope=all&q=ada');
	});

	it('omits an empty search term entirely', async () => {
		// Arrange
		const { api, calls } = apiWith(() => Response.json([]));

		// Act
		await api.listAllGuests('   ');

		// Assert
		expect(calls[0]!.url).toBe('/api/guests?scope=all');
	});

	it('translates a lottery tier into the multiplier the API takes', async () => {
		// Arrange
		const { api, calls } = apiWith(() => new Response(null, { status: 200 }));

		// Act
		await api.addGuest(
			{ ...manualGuest, lotteryWeightTier: 'highest' },
			{ marketEventId: 'event-1', locale: 'es' },
		);

		// Assert
		const body = JSON.parse(calls[0]!.body) as Record<string, unknown>;

		expect(body.lotteryWeight).toBeGreaterThan(1);
		expect(body).toMatchObject({ marketEventId: 'event-1', locale: 'es', source: 'admin' });
	});

	it('resolves to the ids the queue actually called', async () => {
		// Arrange
		const { api } = apiWith(() => Response.json({ called: ['visit-1', 'visit-2'] }));

		// Act
		const called = await api.callNext(2);

		// Assert
		expect(called).toEqual(['visit-1', 'visit-2']);
	});

	it('resolves to the number of recipients a broadcast reached', async () => {
		// Arrange
		const { api } = apiWith(() => Response.json({ queued: 12 }));

		// Act
		const queued = await api.sendBroadcast({ title: 'Doors open', body: 'Come on in' });

		// Assert
		expect(queued).toBe(12);
	});

	it('throws a labelled error when the server rejects a call', async () => {
		// Arrange
		const { api } = apiWith(() => new Response(null, { status: 500 }));

		// Act & Assert
		await expect(api.listHistory()).rejects.toThrow('history');
	});

	it('reports demo data as unavailable rather than throwing when the check fails', async () => {
		// Arrange
		const { api } = apiWith(() => {
			throw new Error('offline');
		});

		// Act
		const enabled = await api.isDemoDataEnabled();

		// Assert
		expect(enabled).toBe(false);
	});
});
