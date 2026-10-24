import { HTTPException } from 'hono/http-exception';

import { Auth0RequestQueue } from './auth0-request-queue.mjs';

// Cache only the M2M credential, never user authorization. Rotate on configuration changes.
let cachedToken: { key: string; token: string; expiresAt: number } | undefined;

/** Server-only credentials. Never use the deploy CLI's tenant administrator credentials. */
export class Auth0Management {
	private token: string | null = null;
	private readonly origin: string;

	constructor(private readonly request: typeof fetch = fetch) {
		const domain = process.env.AUTH0_MANAGEMENT_DOMAIN;

		if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
			throw new HTTPException(503, { message: 'Worker management is not configured.' });
		}
		this.origin = `https://${domain}`;
	}

	static get configured(): boolean {
		return !!process.env.AUTH0_MANAGEMENT_DOMAIN;
	}

	async call<T>(path: string, method = 'GET', body?: object): Promise<T> {
		if (!this.token) {
			const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
			const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;

			if (!clientId || !clientSecret) {
				throw new HTTPException(503, { message: 'Worker management is not configured.' });
			}
			const key = [this.origin, clientId, clientSecret].join('\0');

			if (cachedToken?.key === key && cachedToken.expiresAt > Date.now()) {
				this.token = cachedToken.token;
			} else {
				const response = await this.request(`${this.origin}/oauth/token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						grant_type: 'client_credentials',
						client_id: clientId,
						client_secret: clientSecret,
						audience: `${this.origin}/api/v2/`,
					}),
					signal: AbortSignal.timeout(10000),
				});

				if (!response.ok) {
					this.unavailable(response.status, 'authentication');
				}
				const data = (await response.json()) as { access_token?: string; expires_in?: number };

				if (!data.access_token) {
					this.unavailable();
				}
				this.token = data.access_token!;
				cachedToken = {
					key,
					token: this.token,
					expiresAt: Date.now() + Math.max(0, (data.expires_in ?? 0) - 60) * 1000,
				};
			}
		}
		const response = await Auth0RequestQueue.forTenant(this.origin).run(
			() =>
				this.request(`${this.origin}/api/v2/${path}`, {
					method,
					headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
					body: body ? JSON.stringify(body) : undefined,
					signal: AbortSignal.timeout(10000),
				}),
			method,
		);

		// A token issued before an M2M permission change remains valid but can receive 403.
		// Discard it so a later request gets the new grant; never replay a failed mutation.
		if (response.status === 401 || response.status === 403) {
			cachedToken = undefined;
			this.token = null;
		}

		// Provider errors may contain secrets or personal information; never forward their body.
		if (response.status === 409) {
			throw new HTTPException(409, {
				message: 'That account already exists. Find it in the worker list or manage it in Auth0.',
			});
		}

		if (response.status === 404) {
			throw new HTTPException(404, { message: 'Account not found.' });
		}

		if (!response.ok) {
			this.unavailable(response.status, 'request');
		}

		return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
	}

	private unavailable(status?: number, operation?: 'authentication' | 'request'): never {
		throw new HTTPException(503, {
			message: status
				? `Auth0 ${operation} failed (HTTP ${status}). Refresh the list before trying again.`
				: 'Auth0 could not complete the request. Refresh the list before trying again.',
		});
	}
}
