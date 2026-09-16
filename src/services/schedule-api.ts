import type { PatternInput, SchedulePayload, SessionInput } from './schedule-payload.ts';

export type ScheduleApiOptions = {
	/** Supplies authentication headers without coupling this module to Auth0. */
	requestHeaders?: () => HeadersInit | Promise<HeadersInit>;
	request?: typeof fetch;
};

/**
 * The Schedule tab's calls to `/api/admin/schedule`. Every write answers with the whole schedule,
 * so each method resolves to the new payload; a refusal rejects with the server's own message.
 */
export class ScheduleApi {
	private readonly requestHeaders: () => HeadersInit | Promise<HeadersInit>;
	private readonly request: typeof fetch;

	constructor(options: ScheduleApiOptions = {}) {
		this.requestHeaders = options.requestHeaders ?? (() => ({}));
		this.request = options.request ?? ((input, init) => fetch(input, init));
	}

	load(): Promise<SchedulePayload> {
		return this.call('GET', '/api/admin/schedule');
	}

	savePattern(input: PatternInput): Promise<SchedulePayload> {
		return this.call('PUT', '/api/admin/schedule/pattern', input);
	}

	deletePattern(): Promise<SchedulePayload> {
		return this.call('DELETE', '/api/admin/schedule/pattern');
	}

	createNextSession(): Promise<SchedulePayload> {
		return this.call('POST', '/api/admin/schedule/pattern/next-session');
	}

	addSession(input: SessionInput): Promise<SchedulePayload> {
		return this.call('POST', '/api/admin/schedule/sessions', input);
	}

	updateSession(id: string, input: SessionInput): Promise<SchedulePayload> {
		return this.call('PATCH', `/api/admin/schedule/sessions/${encodeURIComponent(id)}`, input);
	}

	deleteSession(id: string): Promise<SchedulePayload> {
		return this.call('DELETE', `/api/admin/schedule/sessions/${encodeURIComponent(id)}`);
	}

	private async call(method: string, url: string, body?: object): Promise<SchedulePayload> {
		const headers = new Headers(await this.requestHeaders());

		if (body) {
			headers.set('Content-Type', 'application/json');
		}

		const response = await this.request(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw new Error(await errorMessage(response));
		}

		return (await response.json()) as SchedulePayload;
	}
}

async function errorMessage(response: Response): Promise<string> {
	try {
		const { error } = (await response.json()) as { error?: unknown };

		if (typeof error === 'string' && error) {
			return error;
		}
	} catch {
		// An error response is not required to contain JSON.
	}

	return 'The schedule could not be updated.';
}
