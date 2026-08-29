import { runInAction } from 'mobx';

import type { Locale } from '../locales.ts';
import {
	AdminApi,
	type AdminGuest,
	type HistoricalEvent,
	type ManualGuest,
	type QueueGuest,
} from '../services/admin-api.ts';
import type { AdminFeedback } from '../services/admin-feedback.ts';
import { viewsFor, type AdminView } from '../services/admin-views.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { Permission } from '../services/permissions.ts';
import type { SessionCommand } from '../services/sessionStateMachine.ts';
import type { VisitCommand } from '../services/visitStateMachine.ts';
import { visitCommandTarget } from '../services/visitStateMachine.ts';
import type { SessionSettingsInput, MarketSessionStore } from './market-session.store.ts';

/** The session commands the dashboard offers as one-click actions. */
export type MarketAction = Exclude<SessionCommand, 'postpone_registration' | 'update_registration'>;

export type AdminStoreOptions = {
	api?: AdminApi;
	/** Reads the permissions this worker holds. Injected so the store stays free of Auth0. */
	readPermissions?: () => Promise<Permission[]>;
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
	private _guests: AdminGuest[] = [];
	private _sessionGuests: AdminGuest[] = [];
	private _history: HistoricalEvent[] = [];
	private _permissions: Permission[] = [];
	private _isBusy = false;
	private _feedback: AdminFeedback | null = null;
	private readonly api: AdminApi;
	private readonly readPermissions: () => Promise<Permission[]>;

	get guests(): AdminGuest[] {
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

	get feedback(): AdminFeedback | null {
		return this._feedback;
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

		return makeReactive(this, { api: false, readPermissions: false, session: false });
	}

	can(permission: Permission): boolean {
		return this._permissions.includes(permission);
	}

	clearFeedback(): void {
		this._feedback = null;
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
			runInAction(() => (this._feedback = { kind: 'error' }));
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

	/** Reloads a guest list without letting a failure surface as an unhandled rejection. */
	async searchGuests(search: string): Promise<void> {
		await this.run(() => this.refreshGuests(search), null);
	}

	async saveSettings(settings: SessionSettingsInput): Promise<boolean> {
		return this.run(async () => {
			if (!(await this.session.saveSettings(settings))) {
				throw new Error('save');
			}

			runInAction(() => (this._feedback = { kind: 'saved' }));

			return true;
		}, false);
	}

	async runMarketAction(action: MarketAction): Promise<void> {
		await this.run(async () => {
			if (!(await this.session.sendCommand(action))) {
				throw new Error('action');
			}

			await Promise.all([this.refreshGuests(), this.refreshSessionGuests()]);
			runInAction(
				() =>
					(this._feedback =
						action === 'run_lottery' ? { kind: 'draw-complete' } : { kind: 'session-updated' }),
			);
		}, undefined);
	}

	async postponeRegistration(minutes: number): Promise<boolean> {
		return this.run(async () => {
			if (!(await this.session.sendCommand('postpone_registration', { minutes }))) {
				throw new Error('postpone');
			}

			runInAction(() => (this._feedback = { kind: 'session-updated' }));

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

			runInAction(() => (this._feedback = { kind: 'saved' }));

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
				this._feedback = { kind: 'error' };
			});
		}
	}

	async addGuest(guest: ManualGuest, context: { marketEventId?: string | null; locale: Locale }) {
		await this.run(async () => {
			await this.api.addGuest(guest, {
				marketEventId:
					context.marketEventId === undefined
						? (this.session.currentState?.event?.id ?? null)
						: context.marketEventId,
				locale: context.locale,
			});
			await this.session.getStatus();
			await this.refreshAll();
		}, undefined);
	}

	async callNext(count: number): Promise<void> {
		await this.run(async () => {
			const called = await this.api.callNext(count);

			await Promise.all([this.session.getStatus(), this.refreshSessionGuests()]);

			if (!called.length) {
				runInAction(() => (this._feedback = { kind: 'no-waiting-guests' }));
			}
		}, undefined);
	}

	async sendBroadcast(message: { title: string; body: string }): Promise<boolean> {
		return this.run(async () => {
			const recipients = await this.api.sendBroadcast(message);

			runInAction(
				() =>
					(this._feedback = recipients
						? { kind: 'broadcast-queued', recipients }
						: { kind: 'broadcast-no-recipients' }),
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
			this.session.applyServerState(await this.api.loadDemoScenario(...parameters));
			await this.refreshAll();
			runInAction(() => (this._feedback = { kind: 'demo-loaded' }));
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
				this._feedback = { kind: 'error' };
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
