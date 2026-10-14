/**
 * The market's server, as the guest phone sees it: every guest-facing request the app makes,
 * answered from the scene the guide is showing. The phone installs `fetch` as its own window's, so
 * the app's stores and API clients reach it exactly as they would reach Netlify.
 */
import type { CurrentVisit } from '../../../src/services/guestVisitApi.ts';
import { SessionStatusEnum } from '../../../src/services/sessionStateMachine.ts';
import type { SessionOverview } from '../../../src/stores/market-session.store.ts';
import type { PhoneScene } from './scene.ts';

/** The one market the guide follows. A visit only shows while it names the market on screen. */
export const MARKET_ID = 'guide-market';
export const VISIT_ID = 'guide-visit';
/** How long registration stays open, matching the guide's narration. */
const REGISTRATION_WINDOW_MS = 15 * 60_000;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export class PhoneServer {
	private inFlight = 0;
	private idle: (() => void)[] = [];
	/** Requests the guide has no answer for, which `verify.ts` expects to be none. */
	readonly unexpected: string[] = [];

	constructor(public scene: PhoneScene) {}

	/** The market as `/api/market` reports it. */
	get overview(): SessionOverview {
		const { market } = this.scene;

		if (market.status === 'inactive') {
			return { event: null, questions: [], counts: {} };
		}

		return {
			event: {
				id: MARKET_ID,
				status: market.status as SessionStatusEnum,
				capacity: 100,
				registrationOpensAt: new Date(
					market.registrationClosesAt - REGISTRATION_WINDOW_MS,
				).toISOString(),
				registrationClosesAt: new Date(market.registrationClosesAt).toISOString(),
			},
			questions: [],
			counts: {},
		};
	}

	/** The guest's visit as `/api/visit` reports it, or `null` for none. */
	get visit(): CurrentVisit | null {
		const { visit } = this.scene;

		if (!visit) {
			return null;
		}

		return {
			id: VISIT_ID,
			marketEventId: MARKET_ID,
			status: visit.status,
			queuePosition: visit.queuePosition,
			priorityNumber: null,
			aheadOfYou: visit.aheadOfYou,
			calledAt: visit.calledAt === null ? null : new Date(visit.calledAt).toISOString(),
			nowCalling: visit.nowCalling,
			called: visit.called,
			calledPriority: [],
		};
	}

	readonly fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		this.inFlight += 1;

		try {
			// A turn of the event loop, as a network answer would take, so nothing settles early.
			await Promise.resolve();

			// Not a `Request`: a relative URL has nothing to resolve against inside a `srcdoc` frame.
			const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.href;

			return this.answer(init?.method ?? 'GET', url);
		} finally {
			this.inFlight -= 1;

			if (this.inFlight === 0) {
				for (const resolve of this.idle.splice(0)) {
					resolve();
				}
			}
		}
	};

	/** Resolves once no request is waiting for its answer. */
	whenIdle(): Promise<void> {
		return this.inFlight === 0
			? Promise.resolve()
			: new Promise((resolve) => this.idle.push(resolve));
	}

	private answer(method: string, url: string): Response {
		const { pathname } = new URL(url, 'https://market.invalid');
		const route = `${method.toUpperCase()} ${pathname}`;

		switch (route) {
			case 'GET /api/market':
				return json(this.overview);
			case 'GET /api/visit':
				return this.visit ? json(this.visit) : json({ error: 'Not found' }, 404);
			// Push needs a service worker, which a phone in a presentation never has.
			case 'GET /api/push-subscription':
				return json({ configured: false, publicKey: null });
			case 'GET /api/sms-subscription':
				return json({ configured: true });
			case 'POST /api/sms-subscription':
				return json({ consent: true });
			case 'GET /api/notification-status':
				return json({ pushSubscribed: false, smsConsented: this.scene.texts.consented });
			default:
				this.unexpected.push(route);

				return json({ error: 'Not in the guide' }, 404);
		}
	}
}
