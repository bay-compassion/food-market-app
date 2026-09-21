import type { BrowserContext, Route } from 'playwright';

import type { Locale } from '../../src/locales.js';
import type { CurrentVisit } from '../../src/services/guestVisitApi.js';
import { SessionStatusEnum } from '../../src/services/sessionStateMachine.js';
import { StorageKey } from '../../src/services/storage.service.js';
import type { ScreenshotStep } from './screenshot-catalog.mjs';

/**
 * Where a visit token is kept. `visit.store.ts` holds it in a module-private constant, so the name
 * is repeated here rather than imported; a rename there shows up as a screenshot with no visit in it,
 * which the beat's anchor turns into a failed run.
 */
const visitTokenKey = 'bay-compassion.visit-token';

/** A made-up guest, so no screenshot ever carries anyone's real name or number. */
export const fictionalGuest = {
	firstName: 'Sample',
	lastName: 'Guest',
	phone: '(555) 555-0142',
};

/**
 * Ten in the morning on a Saturday market day, in the Bay Area. The clock is held here so a
 * countdown reads the same in every run, and so a screenshot made next month is the same screenshot.
 */
export const screenshotClock = new Date('2026-09-19T17:00:00Z');
export const screenshotTimeZone = 'America/Los_Angeles';

const minutes = (count: number) => count * 60_000;

/**
 * What `/api/market` answers. The app types this as `SessionOverview`, in a store the node
 * projects cannot import, so the parts a guest's screens read are restated; a field the app starts
 * to need shows up as a beat that no longer reaches its screen.
 */
type MarketResponse = {
	event: {
		id: string;
		status: SessionStatusEnum;
		capacity: number;
		registrationOpensAt: string;
		registrationClosesAt: string;
	} | null;
	questions: never[];
	counts: Record<string, never>;
};

/**
 * What the app is told for one beat: what the device has saved, and how the server answers.
 *
 * Everything the screen shows about the world comes through here — the market, the visit, the
 * notification settings — so a beat is a description of the state, and nothing about the app is
 * changed to reach it.
 */
export class SceneFixtures {
	constructor(
		private readonly step: ScreenshotStep,
		private readonly locale: Locale,
		private readonly now: Date = screenshotClock,
	) {}

	/** The device's `localStorage`, key to raw string. */
	get storage(): Record<string, string> {
		const { guest = 'returning', visit } = this.step;

		const entries: Record<string, string> = {
			[StorageKey.LOCALE]: this.locale,
			[StorageKey.RETURNING_VISITOR]: JSON.stringify(true),
		};

		if (guest === 'identified') {
			entries[StorageKey.GUEST_DEVICE_TOKEN] = JSON.stringify('screenshots-device-token');
			entries[StorageKey.GUEST_IDENTITY] = JSON.stringify(fictionalGuest);
		}

		if (visit) {
			entries[visitTokenKey] = 'screenshots-visit-token';
		}

		return entries;
	}

	/** Today's market, with the window placed around "now" to match its status. */
	get market(): MarketResponse {
		const { market } = this.step;

		if (!market) {
			return { event: null, questions: [], counts: {} };
		}

		const now = this.now.getTime();
		// Each status implies where the registration window sits relative to now.
		const window =
			market === SessionStatusEnum.SCHEDULED
				? { opens: now + minutes(7 * 24 * 60), closes: now + minutes(7 * 25 * 60) }
				: market === SessionStatusEnum.REGISTRATION_OPEN
					? { opens: now - minutes(30), closes: now + minutes(30) }
					: { opens: now - minutes(90), closes: now - minutes(30) };

		return {
			event: {
				id: 'screenshots-market',
				status: market,
				capacity: 60,
				registrationOpensAt: new Date(window.opens).toISOString(),
				registrationClosesAt: new Date(window.closes).toISOString(),
			},
			questions: [],
			counts: {},
		};
	}

	/** The guest's visit, or `null` when they have none. */
	get visit(): CurrentVisit | null {
		const { visit } = this.step;

		return visit
			? {
					id: 'screenshots-visit',
					marketEventId: 'screenshots-market',
					status: visit.status,
					queuePosition: visit.queuePosition ?? null,
					aheadOfYou: visit.aheadOfYou ?? null,
				}
			: null;
	}

	/**
	 * Puts the device and the server in this beat's state, before the app loads. Nothing here
	 * touches a real backend: an `/api` call the beat does not know about is refused, so a screen
	 * that starts asking for something new fails visibly rather than reaching for a live service.
	 */
	async install(context: BrowserContext): Promise<void> {
		await context.clock.setFixedTime(this.now);
		await context.addInitScript((entries) => {
			for (const [key, value] of Object.entries(entries)) {
				localStorage.setItem(key, value);
			}
		}, this.storage);
		await context.route('**/api/**', (route) => this.answer(route));
	}

	private async answer(route: Route): Promise<void> {
		const { pathname } = new URL(route.request().url());
		const method = route.request().method();
		const { server = {} } = this.step;
		const fail = (status: number) => route.fulfill({ status, json: { error: 'Unavailable.' } });

		switch (pathname) {
			case '/api/market':
				// Left unanswered, which is what a slow connection looks like from the page.
				if (server.market === 'pending') {
					return;
				}

				return server.market === 'unreachable' ? fail(503) : route.fulfill({ json: this.market });
			case '/api/visit':
				if (method === 'PATCH') {
					return route.fulfill({ json: { id: 'screenshots-visit', status: 'cancelled' } });
				}

				return this.visit
					? route.fulfill({ json: this.visit })
					: route.fulfill({ status: 404, json: { error: 'No visit.' } });
			case '/api/lottery-registration':
				return route.fulfill({
					json: {
						id: 'screenshots-visit',
						status: 'registered',
						visitToken: 'screenshots-visit-token',
					},
				});
			case '/api/guest-information':
				return route.fulfill({
					json: { guestId: 'screenshots-guest', deviceToken: 'screenshots-device-token' },
				});
			case '/api/push-subscription':
				return route.fulfill({ json: { configured: false, publicKey: null } });
			case '/api/sms-subscription':
				return method === 'POST' && server.enableText === 'fails'
					? fail(500)
					: route.fulfill({ json: { configured: true } });
			case '/api/notification-status':
				if (server.notifications === 'pending') {
					return;
				}

				return server.notifications === 'unreachable'
					? fail(500)
					: route.fulfill({
							json: {
								pushSubscribed: false,
								smsConsented: server.notifications === 'enabled',
								...(server.notifications === 'opted-out'
									? { smsOptOutSender: '+15105550100' }
									: {}),
							},
						});
			default:
				return route.fulfill({ status: 404, json: { error: 'Not available while capturing.' } });
		}
	}
}
