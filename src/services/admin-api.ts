import type { Locale } from '../locales.ts';
import type { SessionOverview } from '../stores/market-session.store.ts';
import type { AgeRange } from './ageRanges.ts';
import type { ServiceProgress } from './demoScenario.ts';
import type { GuestAdmission, QueuePlacement } from './guestAdmission.ts';
import { lotteryWeightFor, type LotteryWeightTier } from './lotteryWeight.ts';
import type { SessionMode, SessionStatus } from './sessionStateMachine.ts';
import type { VisitCommand, VisitStatus } from './visitStateMachine.ts';

/** One visit as the queue screens render it. */
export type QueueGuest = {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	householdSize: number;
	locale: Locale;
	queuePosition: number | null;
	calledAt: string | null;
	status: VisitStatus;
};

/** A queue guest together with the session they belong to, as the admin endpoints return them. */
export type AdminGuest = QueueGuest & { marketEventId: string | null };

/** One registration question, as the question bank edits it. */
export type Question = {
	id?: string;
	prompt: string;
	type: 'text' | 'scale';
	required: boolean;
};

/** What the manual guest form collects for a guest a worker adds by hand. */
export type ManualGuest = {
	firstName: string;
	lastName: string;
	ageRange: AgeRange | '';
	householdSize: string | number;
	childrenCount: string | number;
	seniorsCount: string | number;
	phone: string;
	queuePlacement: QueuePlacement;
	admission: GuestAdmission;
	lotteryWeightTier: LotteryWeightTier;
};

/** The market event as the admin screens render it. */
export type AdminMarketEvent = {
	id: string;
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	sessionMode: SessionMode;
	status: SessionStatus;
};

/** A finished session as the history view renders it. */
export type HistoricalEvent = AdminMarketEvent & { guestCount: number };

export type AdminApiOptions = {
	/** Supplies authentication headers without coupling this module to Auth0. */
	requestHeaders?: () => HeadersInit | Promise<HeadersInit>;
	request?: typeof fetch;
};

/**
 * Every call the admin screens make to the market API.
 *
 * This exists so the admin area gets the same separation the guest side already has in
 * `guestVisitApi.ts`: endpoints, request shapes, and response parsing live here, and the stores
 * and components above deal in domain types rather than in `fetch`.
 */
export class AdminApi {
	private readonly requestHeaders: () => HeadersInit | Promise<HeadersInit>;
	private readonly request: typeof fetch;

	constructor(options: AdminApiOptions = {}) {
		this.requestHeaders = options.requestHeaders ?? (() => ({}));
		this.request = options.request ?? ((input, init) => fetch(input, init));
	}

	/** Every guest on record, optionally narrowed by a free-text search. */
	async listAllGuests(search = ''): Promise<AdminGuest[]> {
		const params = new URLSearchParams({ scope: 'all' });

		if (search.trim()) {
			params.set('q', search.trim());
		}

		return this.readJson<AdminGuest[]>(await this.get(`/api/admin/guests?${params}`), 'guests');
	}

	/** The guests attached to one session. */
	async listSessionGuests(marketEventId: string): Promise<AdminGuest[]> {
		const params = new URLSearchParams({ marketEventId });

		return this.readJson<AdminGuest[]>(
			await this.get(`/api/admin/guests?${params}`),
			'session-guests',
		);
	}

	/** Sessions that have finished, for the history screen. */
	async listHistory(): Promise<HistoricalEvent[]> {
		return this.readJson<HistoricalEvent[]>(
			await this.get('/api/admin/market?view=history'),
			'history',
		);
	}

	/** Moves one guest through the visit lifecycle — calling, serving, marking a no-show. */
	async runGuestCommand(id: string, command: VisitCommand): Promise<void> {
		this.assertOk(await this.send('PATCH', '/api/admin/guests', { id, command }), 'command');
	}

	/**
	 * Adds a guest by hand. `marketEventId` names the session to attach them to: the live one for
	 * a walk-in, or a finished one when the history view records someone served outside the app.
	 */
	async addGuest(
		guest: ManualGuest,
		context: { marketEventId: string | null; locale: Locale },
	): Promise<void> {
		this.assertOk(
			await this.send('POST', '/api/admin/guests', {
				...guest,
				// The form speaks in named tiers; the API takes the multiplier behind one.
				lotteryWeight: lotteryWeightFor(guest.lotteryWeightTier),
				locale: context.locale,
				marketEventId: context.marketEventId,
				answers: {},
				source: 'admin',
			}),
			'guest',
		);
	}

	/** Calls the next `count` waiting guests forward. Resolves to the visit ids actually called. */
	async callNext(count: number): Promise<string[]> {
		const response = await this.send('POST', '/api/admin/queue', { action: 'call_next', count });
		const { called } = await this.readJson<{ called: string[] }>(response, 'call_next');

		return called;
	}

	/** Sends a push and SMS broadcast. Resolves to how many recipients it was queued for. */
	async sendBroadcast(message: { title: string; body: string }): Promise<number> {
		const response = await this.send('POST', '/api/admin/broadcast', message);
		const { queued } = await this.readJson<{ queued: number }>(response, 'broadcast');

		return queued;
	}

	/** Whether the deployment will serve demo data at all. */
	async isDemoDataEnabled(): Promise<boolean> {
		try {
			const response = await this.get('/api/admin/demo-data');

			return response.ok ? (await response.json()).enabled === true : false;
		} catch {
			return false;
		}
	}

	/** Replaces the current session with fake data staged at `stage`. Destructive. */
	async loadDemoScenario(
		stage: SessionStatus,
		serviceProgress?: ServiceProgress,
	): Promise<SessionOverview> {
		const response = await this.send('POST', '/api/admin/demo-data', { stage, serviceProgress });

		return this.readJson<SessionOverview>(response, 'demo-data');
	}

	private async get(url: string): Promise<Response> {
		return this.request(url, { headers: await this.requestHeaders() });
	}

	private async send(method: 'POST' | 'PATCH', url: string, body: object): Promise<Response> {
		const headers = new Headers(await this.requestHeaders());

		headers.set('Content-Type', 'application/json');

		return this.request(url, { method, headers, body: JSON.stringify(body) });
	}

	private assertOk(response: Response, label: string): void {
		if (!response.ok) {
			throw new Error(label);
		}
	}

	private async readJson<T>(response: Response, label: string): Promise<T> {
		this.assertOk(response, label);

		return (await response.json()) as T;
	}
}
