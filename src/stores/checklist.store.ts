import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, type StorageService } from '../services/storage.service.ts';
import type { AdminStore } from './admin.store.ts';
import type { MarketSessionStore } from './market-session.store.ts';

/** The steps ticked off on this device, and the session they were ticked for. */
type ChecklistProgress = { sessionId: string; steps: string[] };

function isChecklistProgress(value: unknown): value is ChecklistProgress {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const { sessionId, steps } = value as Record<string, unknown>;

	return (
		typeof sessionId === 'string' &&
		Array.isArray(steps) &&
		steps.every((step) => typeof step === 'string')
	);
}

/** A link in a step asking for one help topic further down to be opened and shown. */
export type ChecklistRevealRequest = { readonly topic: string };

/** How far through a group of steps this device has got. */
export type ChecklistProgressCount = { done: number; total: number };

/**
 * Which of the Checklist's steps have been ticked off, on this device, for the session being set up.
 *
 * Ticks live only in this browser: each station is usually set up by one person on their own phone,
 * so sharing them would cost a server round trip and a conflict rule for little gain. They belong to
 * one session, and a different session starts with none, so nothing needs clearing by hand. A
 * session that has not loaded yet is not a different one: until a session is known, ticking is off
 * and the stored ticks are left alone.
 *
 * A step the app can see for itself is ticked by the app instead: the printing station's "wait for
 * Online" follows the station's own check-in. A worker who can't run the queue never learns whether
 * the station is online, so for them it is an ordinary step.
 */
export class ChecklistStore {
	/** The step the printing station's own check-in ticks. */
	static readonly printStationOnlineStep = 'printing-wait-online';

	private _progress: ChecklistProgress | null;

	private _revealRequest: ChecklistRevealRequest | null = null;

	constructor(
		private readonly session: Pick<MarketSessionStore, 'currentState'>,
		private readonly admin: Pick<AdminStore, 'printStationOnline'>,
		private readonly storage: Pick<StorageService, 'get' | 'set'>,
	) {
		const stored = storage.get(StorageKey.CHECKLIST_PROGRESS);

		this._progress = isChecklistProgress(stored) ? stored : null;

		return makeReactive(this, { session: false, admin: false, storage: false });
	}

	/** The session the ticks are for, or null while there is none (or it hasn't loaded). */
	get sessionId(): string | null {
		return this.session.currentState?.event?.id ?? null;
	}

	/** Ticks need a session to belong to. */
	get canTick(): boolean {
		return this.sessionId !== null;
	}

	/** The steps ticked by hand for the current session. */
	private get ticked(): ReadonlySet<string> {
		const progress = this._progress;

		return new Set(progress && progress.sessionId === this.sessionId ? progress.steps : []);
	}

	/**
	 * The help topic a step's link last asked for, until it has been shown. A new object each time,
	 * so asking for the same topic twice opens it again.
	 */
	get revealRequest(): ChecklistRevealRequest | null {
		return this._revealRequest;
	}

	reveal(topic: string): void {
		this._revealRequest = { topic };
	}

	/** The topic has been opened and scrolled to; reopening its section later shouldn't jump there. */
	settleReveal(): void {
		this._revealRequest = null;
	}

	/** Whether the app ticks this step on its own, rather than the worker. */
	isAutomatic(stepId: string): boolean {
		return (
			stepId === ChecklistStore.printStationOnlineStep && this.admin.printStationOnline !== null
		);
	}

	isTicked(stepId: string): boolean {
		return this.isAutomatic(stepId)
			? this.admin.printStationOnline === true
			: this.ticked.has(stepId);
	}

	toggle(stepId: string): void {
		const sessionId = this.sessionId;

		if (sessionId === null || this.isAutomatic(stepId)) {
			return;
		}

		const steps = new Set(this.ticked);

		if (!steps.delete(stepId)) {
			steps.add(stepId);
		}

		// A tick for a new session replaces the last session's record, which is how old ticks go.
		this._progress = { sessionId, steps: [...steps] };
		this.storage.set(StorageKey.CHECKLIST_PROGRESS, this._progress);
	}

	progress(stepIds: readonly string[]): ChecklistProgressCount {
		return {
			done: stepIds.filter((stepId) => this.isTicked(stepId)).length,
			total: stepIds.length,
		};
	}

	isComplete(stepIds: readonly string[]): boolean {
		const { done, total } = this.progress(stepIds);

		return total > 0 && done === total;
	}
}
