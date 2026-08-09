import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.js';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.js', () => ({ requireAuth0: vi.fn() }));

import handler from '../../functions/reports.js';
import { requireAuth0 } from '../../lib/auth.js';

function request(query = '?report=session-summary&from=2026-01-01&to=2026-08-08') {
	return new Request(`https://example.com/api/reports${query}`);
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requireAuth0).mockReset();
});

describe('reports handler', () => {
	it('returns 405 for anything but GET', async () => {
		const response = await handler(
			new Request('https://example.com/api/reports', { method: 'POST' }),
		);

		expect(response.status).toBe(405);
	});

	it('returns the requireAuth0 response when unauthorized, without querying anything', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requireAuth0).mockResolvedValueOnce(unauthorized);

		const response = await handler(request());

		expect(response).toBe(unauthorized);
		expect(db.execute).not.toHaveBeenCalled();
	});

	it('rejects a range whose end is before its start', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);

		const response = await handler(
			request('?report=session-summary&from=2026-08-08&to=2026-01-01'),
		);

		expect(response.status).toBe(400);
		expect(db.execute).not.toHaveBeenCalled();
	});

	it('rejects a report id it does not know', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);

		const response = await handler(request('?report=everything&from=2026-01-01&to=2026-08-08'));

		expect(response.status).toBe(400);
		expect(db.execute).not.toHaveBeenCalled();
	});

	it('returns the rows for a known report', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		queueResult([{ sessionDate: '2026-03-01T17:00:00.000Z', served: 48 }]);

		const response = await handler(request());

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			id: 'session-summary',
			rows: [{ sessionDate: '2026-03-01T17:00:00.000Z', served: 48 }],
		});
	});

	it('serves the visit export as a downloadable CSV', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		queueResult([{ guest_first_name: 'Ana', guest_last_name: 'Reyes' }]);

		const response = await handler(request('?view=export&from=2026-01-01&to=2026-08-08'));

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
		expect(response.headers.get('Content-Disposition')).toContain(
			'visits_2026-01-01_2026-08-08.csv',
		);

		const body = await response.text();
		expect(body).toContain('session_opens_at');
		expect(body).toContain('Ana');
	});

	it('checks the range before deciding the export is what was asked for', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);

		const response = await handler(request('?view=export&from=&to='));

		expect(response.status).toBe(400);
		expect(db.execute).not.toHaveBeenCalled();
	});
});
