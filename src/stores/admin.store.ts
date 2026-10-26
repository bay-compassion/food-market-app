import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import type { Locale } from '../locales.ts';
import { AdminNavigation } from '../models/admin-navigation.ts';
import {
	AdminApi,
	AdminRequestError,
	type AdminGuest,
	type DatabaseGuest,
	type GuestClaimCode,
	type GuestDetails,
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
import type { GuestDeletionPreview } from '../services/guest-deletion.ts';
import { admissionOffersPhoneClaim, type QueuePlacement } from '../services/guestAdmission.ts';
import type { KioskUnlockCode } from '../services/kiosk-unlock.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { Permission } from '../services/permissions.ts';
import type { PrintJobSubmission } from '../services/print-jobs.ts';
import type { SessionCommand } from '../services/sessionStateMachine.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import type { VisitCommand, VisitStatus } from '../services/visitStateMachine.ts';
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
	private _kioskUnlockCode: KioskUnlockCode | null = null;
	private _guestDeletion: GuestDeletionPreview | null = null;
	private _printStationOnline: boolean | null = null;
	/** Guest commands sent and not yet answered. A poll landing meanwhile would undo their status. */
	private pendingGuestCommands = 0;
	/**
	 * Bumped as each change to the guest list starts — a command, a call, an add — so a list
	 * requested before it can be told apart and dropped.
	 */
	private sessionGuestsRevision = 0;
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

	/** The room-display unlock code on screen, if a worker asked for one. */
	get kioskUnlockCode(): KioskUnlockCode | null {
		return this._kioskUnlockCode;
	}

	/**
	 * Whether the print station was checking in at the last look, or `null` when nobody has looked
	 * or the answer could not be had — a worker without `run:queue` can't ask, and an error says
	 * nothing about the station itself.
	 */
	get printStationOnline(): boolean | null {
		return this._printStationOnline;
	}

	/** The guest an admin has asked to delete permanently, while the confirmation dialog is open. */
	get guestDeletion(): GuestDeletionPreview | null {
		return this._guestDeletion;
	}

	/** The screens this worker can open, in navigation order. */
	get views(): AdminView[] {
		return viewsFor(this._permissions);
	}

	/** Those screens as the navigation lists them, under the headings that say what each is for. */
	get navigation(): AdminNavigation {
		return new AdminNavigation(this.views);
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
			pendingGuestCommands: false,
			sessionGuestsRevision: false,
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
		await this.loadPermissions();

		try {
			await this.session.getStatus();

			if (this.can('run:queue')) {
				await this.refreshAll();
			}
		} catch {
			runInAction(() => this.report({ kind: 'error' }));
		}
	}

	/** Reads which permissions this worker holds, treating a failed read as holding none. */
	async loadPermissions(): Promise<void> {
		try {
			const permissions = await this.readPermissions();

			runInAction(() => (this._permissions = permissions));
		} catch {
			runInAction(() => (this._permissions = []));
		}
	}

	async refreshGuests(search = ''): Promise<void> {
		const guests = await this.api.listAllGuests(search);

		runInAction(() => (this._guests = guests));
	}

	async refreshSessionGuests(): Promise<void> {
		const eventId = this.session.currentState?.event?.id ?? null;
		const revision = this.sessionGuestsRevision;

		const guests = eventId ? await this.api.listSessionGuests(eventId) : [];

		runInAction(() => {
			// A list read while a guest command was in flight predates it, and would put the status
			// the worker just changed back until the next refresh.
			if (revision === this.sessionGuestsRevision && this.pendingGuestCommands === 0) {
				this._sessionGuests = guests;
			}
		});
	}

	/** Whether a print station is online to take name tags. */
	async isPrintStationOnline(): Promise<boolean> {
		return this.api.isPrintStationOnline();
	}

	/** Looks again at whether the print station is checking in. Quietly: a failure is no outcome. */
	async checkPrintStation(): Promise<void> {
		if (!this.can('run:queue')) {
			this._printStationOnline = null;

			return;
		}

		const online = await this.api.isPrintStationOnline().catch(() => null);

		runInAction(() => (this._printStationOnline = online));
	}

	/** Sends a visit's name tag to the print station. */
	async sendNameTag(visitId: string): Promise<PrintJobSubmission> {
		return this.api.sendNameTag(visitId);
	}

	/** Saves a guest's pronunciation and notes, then rereads the line so every ticket shows them. */
	async updateGuestDetails(guestId: string, details: GuestDetails): Promise<void> {
		await this.api.updateGuestDetails(guestId, details);
		// The save has landed; a failed reread must not report it as failed and invite a retry.
		await this.refreshSessionGuests().catch(() => {});
	}

	/** One visit's history. Read on demand rather than held, since only an open ticket shows it. */
	async listVisitEvents(visitId: string): Promise<VisitEvent[]> {
		return this.api.listVisitEvents(visitId);
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
	 *
	 * `placement` says where `return_to_queue` puts the guest; without one they go back to the place
	 * they had.
	 */
	async runGuestCommand(
		guest: QueueGuest,
		command: VisitCommand,
		placement?: QueuePlacement,
	): Promise<void> {
		await this.changeGuestStatus(
			guest,
			visitCommandTarget(command),
			() => this.api.runGuestCommand(guest.id, command, placement),
			undefined,
		);
	}

	/**
	 * Serves a called guest and calls the next one in line, in one step on the server so no other
	 * worker can call that next guest in between. Shows the guest as served immediately, as
	 * `runGuestCommand` does. Resolves to the visits called — empty when nobody was waiting, or
	 * when the serve was refused.
	 */
	async serveAndCallNext(guest: QueueGuest): Promise<string[]> {
		return this.changeGuestStatus(guest, 'served', () => this.api.serveAndCallNext(guest.id), []);
	}

	/**
	 * Shows `guest` at `status` while `send` is in flight, then reloads what it changed. A guest-list
	 * refresh that lands meanwhile is dropped, since it predates the change; if `send` fails, the old
	 * status goes back and `onFailure` is what the caller gets.
	 */
	private async changeGuestStatus<T>(
		guest: QueueGuest,
		status: VisitStatus,
		send: () => Promise<T>,
		onFailure: T,
	): Promise<T> {
		const previous = guest.status;

		runInAction(() => {
			guest.status = status;
			this.pendingGuestCommands += 1;
			this.sessionGuestsRevision += 1;
		});

		try {
			let result: T;

			try {
				result = await send();
			} finally {
				runInAction(() => (this.pendingGuestCommands -= 1));
			}
			await Promise.all([this.session.getStatus(), this.refreshSessionGuests()]);

			return result;
		} catch {
			runInAction(() => {
				guest.status = previous;
				this.report({ kind: 'error' });
			});

			return onFailure;
		}
	}

	async addGuest(guest: ManualGuest, context: { marketEventId?: string | null; locale: Locale }) {
		this.sessionGuestsRevision += 1;
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

	/**
	 * Asks for a code to type into a room display, from the queue screen or the dashboard. Also how
	 * the dialog replaces a code that has lapsed while it was open.
	 */
	async showKioskUnlockCode(): Promise<void> {
		try {
			const code = await this.api.issueKioskUnlockCode();

			runInAction(() => {
				this._kioskUnlockCode = code;
			});
		} catch {
			this.notifications.error(adminTranslations.en.kioskUnlock.failed);
		}
	}

	dismissKioskUnlockCode(): void {
		this._kioskUnlockCode = null;
	}

	/** Opens the delete dialog with what deleting this guest would remove, read fresh from the server. */
	async openGuestDeletion(guestId: string): Promise<void> {
		try {
			const preview = await this.api.previewGuestDeletion(guestId);

			runInAction(() => (this._guestDeletion = preview));
		} catch {
			runInAction(() => this.report({ kind: 'error' }));
		}
	}

	dismissGuestDeletion(): void {
		this._guestDeletion = null;
	}

	/**
	 * Permanently deletes the guest the dialog is open for. `phone` is the number the admin typed;
	 * the server refuses unless it is the guest's, and refuses a guest still in an open session.
	 * Resolves to whether the guest was deleted — a refusal leaves the dialog open with its reason.
	 */
	async deleteGuest(phone: string): Promise<boolean> {
		const guest = this._guestDeletion;

		if (!guest) {
			return false;
		}

		return this.run(async () => {
			await this.api.deleteGuest(guest.guestId, phone);

			runInAction(() => {
				this._guestDeletion = null;
				this.report({ kind: 'guest-deleted', name: `${guest.firstName} ${guest.lastName}` });
			});
			// The deletion has landed; a failed reread must not report it as failed and invite a retry.
			await Promise.all([this.refreshGuests(), this.refreshSessionGuests()]).catch(() => {});

			return true;
		}, false);
	}

	/** Calls the next `count` guests in line. Resolves to the visits called, in queue order. */
	async callNext(count: number): Promise<string[]> {
		this.sessionGuestsRevision += 1;

		return this.run(async () => {
			const called = await this.api.callNext(count);

			await Promise.all([this.session.getStatus(), this.refreshSessionGuests()]);

			if (!called.length) {
				runInAction(() => this.report({ kind: 'no-waiting-guests' }));
			}

			return called;
		}, []);
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
		} catch (error) {
			runInAction(() => {
				this.report({
					kind: 'error',
					reason: error instanceof AdminRequestError ? (error.reason ?? undefined) : undefined,
				});
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
