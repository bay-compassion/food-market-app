import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import type { Locale } from '../locales.ts';
import {
	AdminApi,
	type AdminGuest,
	type DatabaseGuest,
	type GuestClaimCode,
	type HistoricalEvent,
	type ManualGuest,
	type QueueGuest,
} from '../services/admin-api.ts';
import {
	adminFeedbackSeverity,
	adminFeedbackText,
	type AdminFeedback,
} from '../services/admin-feedback.ts';
import { viewsFor, type AdminView } from '../services/admin-views.ts';
import { admissionOffersPhoneClaim } from '../services/guestAdmission.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { Permission } from '../services/permissions.ts';
import type { SessionCommand } from '../services/sessionStateMachine.ts';
import type { VisitCommand } from '../services/visitStateMachine.ts';
import { visitCommandTarget } from '../services/visitStateMachine.ts';
import { DemoStore } from './demo.store';
import type { MarketSessionStore } from './market-session.store.ts';
import { NotificationStore } from './notification.store.ts';

/** The session commands the dashboard offers as one-click actions. */
export type MarketAction = Exclude<
	SessionCommand,
	'postpone_registration' | 'update_registration' | 'postpone_lottery' | 'pause_lottery'
>;

/** A phone claim code on screen, with the name of the guest it is for. */
export type GuestClaim = GuestClaimCode & { guestName: string };

export type AdminStoreOptions = {
	api?: AdminApi;
	/** Reads the permissions this worker holds. Injected so the store stays free of Auth0. */
	readPermissions?: () => Promise<Permission[]>;
	/** Where each outcome is raised as a toast. `RootStore` passes the app's own. */
	notifications?: NotificationStore;
};

/**
 * The admin area's own state and orchestration: who the worker is, what guests and history are on
 * screen, and every action that changes them.
 *
 * The session lifecycle itself still belongs to `MarketSessionStore`, which polls it and owns the
 * authoritative overview. This store composes over that one — it sends a command and then reloads
 * whatever the command invalidated, which is the part the dashboard used to do inline.
 *
 * Confirmation prompts are deliberately *not* here. Whether to ask before a destructive action is
 * a presentation decision, so the component asks and then calls the plain method.
 */
export class AdminStore {
	readonly demo = new DemoStore();
	private _guests: DatabaseGuest[] = [];
	private _sessionGuests: AdminGuest[] = [];
	private _history: HistoricalEvent[] = [];
	private _permissions: Permission[] = [];
	private _isBusy = false;
	private _feedback: AdminFeedback | null = null;
	private _guestClaim: GuestClaim | null = null;
	private readonly api: AdminApi;
	private readonly readPermissions: () => Promise<Permission[]>;
	private readonly notifications: NotificationStore;

	get guests(): DatabaseGuest[] {
		return this._guests;
	}

	get sessionGuests(): AdminGuest[] {
		return this._sessionGuests;
	}

	get history(): HistoricalEvent[] {
		return this._history;
	}

	get permissions(): Permission[] {
		return this._permissions;
	}

	get isBusy(): boolean {
		return this._isBusy;
	}

	/** The outcome of the worker's last action, which has already been raised as a toast. */
	get feedback(): AdminFeedback | null {
		return this._feedback;
	}

	/**
	 * A guest just added by hand whom the worker may put on the guest's own phone. Unlike every
	 * other outcome this stays on screen, as a banner with the way to do it, until the worker does
	 * something else — a toast would be gone before a guest had their phone out.
	 */
	get claimableGuest(): { guestId: string; name: string } | null {
		const feedback = this._feedback;

		return feedback?.kind === 'guest-added' && feedback.offersPhoneClaim
			? { guestId: feedback.guestId, name: feedback.name }
			: null;
	}

	/** The code on screen for a guest to scan with their phone, if the worker has opened one. */
	get guestClaim(): GuestClaim | null {
		return this._guestClaim;
	}

	/** The screens this worker can open, in navigation order. */
	get views(): AdminView[] {
		return viewsFor(this._permissions);
	}

	constructor(
		private readonly session: MarketSessionStore,
		options: AdminStoreOptions = {},
	) {
		this.api = options.api ?? new AdminApi();
		this.readPermissions = options.readPermissions ?? (async () => []);
		this.notifications = options.notifications ?? new NotificationStore();

		return makeReactive(this, {
			api: false,
			readPermissions: false,
			notifications: false,
			session: false,
		});
	}

	can(permission: Permission): boolean {
		return this._permissions.includes(permission);
	}

	clearFeedback(): void {
		this._feedback = null;
	}

	/** Records the outcome of an action and raises it as a toast, unless it has a banner of its own. */
	private report(feedback: AdminFeedback): void {
		this._feedback = feedback;

		if (!this.claimableGuest) {
			this.notifications.notify(
				adminFeedbackText(feedback, adminTranslations.en),
				adminFeedbackSeverity(feedback),
			);
		}
	}

	/**
	 * Loads everything the dashboard opens with. Guest data is only requested when the worker holds
	 * `run:queue`; without it those endpoints answer 403, which would read as a broken screen
	 * rather than as a screen that was never theirs.
	 */
	async load(): Promise<void> {
		try {
			const permissions = await this.readPermissions();

			runInAction(() => (this._permissions = permissions));
		} catch {
			runInAction(() => (this._permissions = []));
		}

		try {
			await this.session.getStatus();

			if (this.can('run:queue')) {
				await this.refreshAll();
			}
		} catch {
			runInAction(() => this.report({ kind: 'error' }));
		}
	}

	async refreshGuests(search = ''): Promise<void> {
		const guests = await this.api.listAllGuests(search);

		runInAction(() => (this._guests = guests));
	}

	async refreshSessionGuests(): Promise<void> {
		const eventId = this.session.currentState?.event?.id ?? null;

		const guests = eventId ? await this.api.listSessionGuests(eventId) : [];

		runInAction(() => (this._sessionGuests = guests));
	}

	async refreshHistory(): Promise<void> {
		const history = await this.api.listHistory();

		runInAction(() => (this._history = history));
	}

	async runMarketAction(action: MarketAction): Promise<void> {
		await this.run(async () => {
			if (!(await this.session.sendCommand(action))) {
				throw new Error('action');
			}

			await Promise.all([this.refreshGuests(), this.refreshSessionGuests()]);
			runInAction(() =>
				this.report(
					action === 'run_lottery' ? { kind: 'draw-complete' } : { kind: 'session-updated' },
				),
			);
		}, undefined);
	}

	async postponeRegistration(minutes: number): Promise<boolean> {
		return this.run(async () => {
			if (!(await this.session.sendCommand('postpone_registration', { minutes }))) {
				throw new Error('postpone');
			}

			runInAction(() => this.report({ kind: 'session-updated' }));

			return true;
		}, false);
	}

	/** Stops the automatic draw; a worker can still run it manually. */
	async pauseLottery(): Promise<boolean> {
		return this.run(async () => {
			if (!(await this.session.sendCommand('pause_lottery'))) {
				throw new Error('pause');
			}
			runInAction(() => this.report({ kind: 'session-updated' }));

			return true;
		}, false);
	}

	/** Pushes an automatic lottery draw back by a few minutes. */
	async postponeLottery(minutes: number): Promise<boolean> {
		return this.run(async () => {
			if (!(await this.session.sendCommand('postpone_lottery', { minutes }))) {
				throw new Error('postpone');
			}

			runInAction(() => this.report({ kind: 'session-updated' }));

			return true;
		}, false);
	}

	async updateRegistrationOverrides(
		registrationClosesAt: string,
		capacity: number,
	): Promise<boolean> {
		return this.run(async () => {
			if (
				!(await this.session.sendCommand('update_registration', { registrationClosesAt, capacity }))
			) {
				throw new Error('override');
			}

			runInAction(() => this.report({ kind: 'saved' }));

			return true;
		}, false);
	}

	/**
	 * Moves a guest through the visit lifecycle, showing the new status immediately and putting the
	 * old one back if the server disagrees. The queue is read at a glance during service, so the row
	 * must not sit on the previous status while the request is in flight.
	 */
	async runGuestCommand(guest: QueueGuest, command: VisitCommand): Promise<void> {
		const previous = guest.status;

		runInAction(() => (guest.status = visitCommandTarget(command)));

		try {
			await this.api.runGuestCommand(guest.id, command);
			await Promise.all([this.session.getStatus(), this.refreshSessionGuests()]);
		} catch {
			runInAction(() => {
				guest.status = previous;
				this.report({ kind: 'error' });
			});
		}
	}

	async addGuest(guest: ManualGuest, context: { marketEventId?: string | null; locale: Locale }) {
		await this.run(async () => {
			const { guestId } = await this.api.addGuest(guest, {
				marketEventId:
					context.marketEventId === undefined
						? (this.session.currentState?.event?.id ?? null)
						: context.marketEventId,
				locale: context.locale,
			});

			await this.session.getStatus();
			await this.refreshAll();
			runInAction(() =>
				this.report({
					kind: 'guest-added',
					guestId,
					name: `${guest.firstName} ${guest.lastName}`.trim(),
					offersPhoneClaim: admissionOffersPhoneClaim(guest.admission),
				}),
			);
		}, undefined);
	}

	/**
	 * Creates a code that puts `guest`'s record on a phone, for the worker to show as a QR code.
	 *
	 * Two screens ask: the "guest added" feedback, for a walk-in just added — which stays put, so a
	 * worker who closes the dialog early can open a fresh code without adding the guest again — and a
	 * guest's Actions menu, for a manager. The server decides whether this worker may; a refusal
	 * is reported as such rather than as a failure.
	 */
	async showGuestClaim(guest: { guestId: string; name: string }): Promise<void> {
		try {
			const code = await this.api.createGuestClaim(guest.guestId);

			runInAction(() => {
				if (code) {
					this._guestClaim = { guestName: guest.name, ...code };
				} else {
					this.report({ kind: 'guest-claim-refused' });
				}
			});
		} catch {
			runInAction(() => this.report({ kind: 'error' }));
		}
	}

	dismissGuestClaim(): void {
		this._guestClaim = null;
	}

	async callNext(count: number): Promise<void> {
		await this.run(async () => {
			const called = await this.api.callNext(count);

			await Promise.all([this.session.getStatus(), this.refreshSessionGuests()]);

			if (!called.length) {
				runInAction(() => this.report({ kind: 'no-waiting-guests' }));
			}
		}, undefined);
	}

	async sendBroadcast(message: { title: string; body: string }): Promise<boolean> {
		return this.run(async () => {
			const recipients = await this.api.sendBroadcast(message);

			runInAction(() =>
				this.report(
					recipients
						? { kind: 'broadcast-queued', recipients }
						: { kind: 'broadcast-no-recipients' },
				),
			);

			return recipients > 0;
		}, false);
	}

	/** Whether the deployment will serve demo data at all. */
	async isDemoDataEnabled(): Promise<boolean> {
		return this.api.isDemoDataEnabled();
	}

	async loadDemoScenario(...parameters: Parameters<AdminApi['loadDemoScenario']>): Promise<void> {
		await this.run(async () => {
			const response = await this.api.loadDemoScenario(...parameters);

			runInAction(() => this.demo.save(response.demoRoster, response.event?.id ?? null));
			this.session.applyServerState(response);
			await this.refreshAll();
			runInAction(() => this.report({ kind: 'demo-loaded' }));
		}, undefined);
	}

	private async refreshAll(): Promise<void> {
		await Promise.all([this.refreshGuests(), this.refreshSessionGuests(), this.refreshHistory()]);
	}

	/**
	 * Runs an action with the busy flag held and a cleared banner, recording a generic failure if it
	 * throws. `onFailure` is what the caller gets back in that case.
	 */
	private async run<T>(action: () => Promise<T>, onFailure: T): Promise<T> {
		runInAction(() => {
			this._isBusy = true;
			this._feedback = null;
		});

		try {
			return await action();
		} catch {
			runInAction(() => {
				this.report({ kind: 'error' });
			});

			return onFailure;
		} finally {
			// `finally` resumes on a later tick than the call that entered `run`, so this write is
			// outside that action and needs one of its own.
			runInAction(() => {
				this._isBusy = false;
			});
		}
	}
}
