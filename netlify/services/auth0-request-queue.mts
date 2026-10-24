import { HTTPException } from 'hono/http-exception';

/** Share the tenant's rate-limit window across overlapping requests in a warm function. */
export class Auth0RequestQueue {
	private static readonly tenants = new Map<string, Auth0RequestQueue>();
	private tail: Promise<void> = Promise.resolve();
	private retryAt = 0;

	static forTenant(origin: string): Auth0RequestQueue {
		let queue = this.tenants.get(origin);

		if (!queue) {
			queue = new Auth0RequestQueue();
			this.tenants.set(origin, queue);
		}

		return queue;
	}

	run(request: () => Promise<Response>, method: string): Promise<Response> {
		const result = this.tail.then(() => this.perform(request, method));

		// A failed request must not poison the queue for subsequent callers.
		this.tail = result.then(
			() => undefined,
			() => undefined,
		);

		return result;
	}

	private async perform(request: () => Promise<Response>, method: string): Promise<Response> {
		for (let attempt = 0; ; attempt++) {
			const wait = this.retryAt - Date.now();

			// Fail closed rather than hold a function open through a long quota window.
			if (wait > 5000) {
				throw new HTTPException(503, {
					message: 'Auth0 is temporarily rate limited. Please try again later.',
				});
			}

			if (wait > 0) {
				await new Promise<void>((resolve) => setTimeout(resolve, wait));
			}

			const response = await request();

			this.observe(response, attempt);

			// Only retry reads. Never replay an account creation or access change.
			if (response.status !== 429 || method !== 'GET' || attempt >= 2) {
				return response;
			}

			await response.body?.cancel();
		}
	}

	private observe(response: Response, attempt: number): void {
		if (response.status !== 429 && response.headers.get('x-ratelimit-remaining') !== '0') {
			return;
		}

		const now = Date.now();
		const retryAfter = response.headers.get('Retry-After');
		const seconds = retryAfter === null ? NaN : Number(retryAfter);
		const retryDate = Number.isFinite(seconds)
			? now + seconds * 1000
			: Date.parse(retryAfter ?? '');
		const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
		const announced = Math.max(
			Number.isFinite(retryDate) ? retryDate : 0,
			Number.isFinite(reset) ? reset : 0,
		);

		this.retryAt = Math.max(now + 500 * 2 ** attempt, announced + 100);
	}
}
