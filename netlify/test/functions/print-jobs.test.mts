import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/index.mjs', () => ({ db: {} }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

const queue = {
	isStationOnline: vi.fn(),
	enqueue: vi.fn(),
	pending: vi.fn(),
	complete: vi.fn(),
	heartbeat: vi.fn(),
};

vi.mock('../../services/print-queue.mjs', () => ({
	printQueue: () => queue,
	nameTagFor: vi.fn(),
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/print-jobs.mjs';
import { nameTagFor } from '../../services/print-queue.mjs';

const visitId = '6f1c2a4e-3b5d-4c7e-9f80-1a2b3c4d5e6f';
const jobId = '001791230000000-6f1c2a4e-3b5d-4c7e-9f80-1a2b3c4d5e6f';
const tag = {
	visitId,
	firstName: 'Maria',
	lastInitial: 'S',
	queuePosition: 14,
	locale: 'es' as const,
};

function request(method: string, path: string, body?: unknown) {
	return new Request(`https://example.com/api/admin${path}`, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

afterEach(() => {
	vi.mocked(requirePermission).mockReset();
	vi.mocked(nameTagFor).mockReset();
	Object.values(queue).forEach((mock) => mock.mockReset());
});

describe('print jobs handler', () => {
	it('queues a tag built from the visit when a station is online', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queue.isStationOnline.mockResolvedValueOnce(true);
		vi.mocked(nameTagFor).mockResolvedValueOnce(tag);

		const response = await handler(request('POST', '/print-jobs', { visitId }));

		expect(response.status).toBe(202);
		await expect(response.json()).resolves.toEqual({ queued: true });
		expect(queue.enqueue).toHaveBeenCalledWith(tag);
	});

	it('queues nothing, and says why, with no station online', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queue.isStationOnline.mockResolvedValueOnce(false);

		const response = await handler(request('POST', '/print-jobs', { visitId }));

		await expect(response.json()).resolves.toEqual({
			queued: false,
			reason: 'station_offline',
		});
		expect(queue.enqueue).not.toHaveBeenCalled();
	});

	it('rejects a visit id that is not a UUID', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('POST', '/print-jobs', { visitId: 'visit-1' }));

		expect(response.status).toBe(400);
		expect(queue.enqueue).not.toHaveBeenCalled();
	});

	it('answers 404 for a visit that does not exist', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queue.isStationOnline.mockResolvedValueOnce(true);
		vi.mocked(nameTagFor).mockResolvedValueOnce(null);

		const response = await handler(request('POST', '/print-jobs', { visitId }));

		expect(response.status).toBe(404);
	});

	it('marks the station online when it collects its tags', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queue.pending.mockResolvedValueOnce([]);

		const response = await handler(request('GET', '/print-jobs'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ jobs: [] });
		expect(queue.heartbeat).toHaveBeenCalledOnce();
	});

	it('removes a printed tag', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('DELETE', `/print-jobs/${jobId}`));

		expect(response.status).toBe(204);
		expect(queue.complete).toHaveBeenCalledWith(jobId);
	});

	it('rejects a job id that is not one the queue issued', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('DELETE', '/print-jobs/..%2Fstation%2Fheartbeat'));

		expect(response.status).toBe(400);
		expect(queue.complete).not.toHaveBeenCalled();
	});

	it('tells a phone whether a station is online', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queue.isStationOnline.mockResolvedValueOnce(true);

		const response = await handler(request('GET', '/print-station'));

		await expect(response.json()).resolves.toEqual({ online: true });
	});
});
