import { afterEach, describe, expect, it, vi } from 'vitest';

import { pullStandbyTicket, standbyCodeFrom, standbyUrl } from './standby.ts';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('standby addresses', () => {
	it('carries the code in the fragment, and reads it back', () => {
		// Act
		const url = standbyUrl('https://market.example', 'event-1.abc_-');

		// Assert
		expect(url).toBe('https://market.example/standby#event-1.abc_-');
		expect(standbyCodeFrom(new URL(url).hash)).toBe('event-1.abc_-');
		expect(standbyCodeFrom('')).toBeNull();
	});
});

describe('pullStandbyTicket', () => {
	it.each([
		[409, 'not_open'],
		[410, 'closed'],
		[404, 'invalid'],
		[400, 'invalid'],
		[503, 'unreachable'],
	] as const)('reads a %i as %s', async (status, kind) => {
		// Arrange
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));

		// Act
		const result = await pullStandbyTicket('event-1.abc');

		// Assert
		expect(result).toEqual({ kind });
	});

	it('returns the ticket with the code it was pulled for', async () => {
		// Arrange
		const body = { ticket: 'held', standbyNumber: 3, marketEventId: 'event-1' };

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));

		// Act
		const result = await pullStandbyTicket('event-1.abc');

		// Assert
		expect(result).toEqual({ kind: 'ticket', ticket: { ...body, code: 'event-1.abc' } });
	});
});
