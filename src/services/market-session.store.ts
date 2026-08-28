import { markRaw } from 'vue';

import { makeReactive } from './make-reactive.ts';
import { PageVisibilityPoller } from './page-visibility-poller.ts';
import { type SessionCommand, type SessionMode, SessionStatusEnum } from './sessionStateMachine.ts';
import type { VisitStatus } from './visitStateMachine.ts';

export type SessionQuestion = {
	id: string;
	prompt: string;
	type: 'text' | 'scale';
	required: boolean;
};

export type SessionEvent = {
	id: string;
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	sessionMode: SessionMode;
	status: SessionStatusEnum;
};

export type MarketEventTiming = Pick<SessionEvent, 'id' | 'status' | 'sessionMode'> & {
	registrationOpensAt: Date;
	registrationClosesAt: Date;
};

export type SessionOverview = {
	event: SessionEvent | null;
	questions: SessionQuestion[];
	counts: Partial<Record<VisitStatus, number>>;
};

export type SessionSettingsInput = {
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	sessionMode: SessionMode;
	questions: Array<Omit<SessionQuestion, 'id'> & { id?: string }>;
};

type SessionCommandParameters = {
	schedule_registration: undefined;
	open_registration: undefined;
	postpone_registration: { minutes: number };
	update_registration: { registrationClosesAt: string; capacity: number };
	close_registration: undefined;
	reopen_registration: undefined;
	run_lottery: undefined;
	close_session: undefined;
	reset_session: undefined;
};

export type MarketSessionStoreOptions = {
	pollIntervalMs?: number;
	/** Supplies authentication or other request headers without coupling the store to Auth0. */
	requestHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

const defaultPollIntervalMs = 5_000;

export class MarketSessionStore {
	private _currentState: SessionOverview | null = null;
	private _error: Error | null = null;
	private _isLoading = false;
	private _isPolling = false;
	private _pendingCommands = 0;
	private pagePoller: PageVisibilityPoller | null = null;
	private statusRequest: Promise<void> | null = null;
	private requestRevision = 0;
	private readonly pollIntervalMs: number;
	private readonly requestHeaders: () => HeadersInit | Promise<HeadersInit>;

	get currentState(): SessionOverview | null {
		return this._currentState;
	}

	get currentStatus(): SessionStatusEnum | null {
		return this._currentState?.event?.status ?? null;
	}

	get isActive(): boolean {
		if (!this.currentStatus) {
			return false;
		}

		return [
			SessionStatusEnum.REGISTRATION_OPEN,
			SessionStatusEnum.REGISTRATION_CLOSED,
			SessionStatusEnum.SERVICE_STARTED,
		].includes(this.currentStatus);
	}

	get marketEvent(): MarketEventTiming | null {
		const event = this._currentState?.event;

		return event
			? {
					...event,
					registrationOpensAt: new Date(event.registrationOpensAt),
					registrationClosesAt: new Date(event.registrationClosesAt),
				}
			: null;
	}

	get error(): Error | null {
		return this._error;
	}

	get isLoading(): boolean {
		return this._isLoading;
	}

	get isSending(): boolean {
		return this._pendingCommands > 0;
	}

	get isPolling(): boolean {
		return this._isPolling;
	}

	constructor(options: MarketSessionStoreOptions = {}) {
		this.pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;
		this.requestHeaders = options.requestHeaders ?? (() => ({}));

		return makeReactive(this);
	}

	[Symbol.dispose](): void {
		this.stopPolling();
	}

	startPolling(): void {
		if (!this.pagePoller) {
			this.pagePoller = markRaw(
				new PageVisibilityPoller(
					() => void this.poll(),
					this.pollIntervalMs,
					(isPolling) => {
						this._isPolling = isPolling;
					},
				),
			);
		}

		this.pagePoller.start();
	}

	stopPolling(): void {
		this.pagePoller?.stop();
	}

	async getStatus(): Promise<void> {
		// Reuse an active status request so a slow connection cannot accumulate polls.
		if (this.statusRequest) {
			return this.statusRequest;
		}

		this.statusRequest = this.fetchStatus().finally(() => {
			this.statusRequest = null;
		});

		return this.statusRequest;
	}

	async sendCommand<Command extends SessionCommand>(
		command: Command,
		...parameters: SessionCommandParameters[Command] extends undefined
			? []
			: [parameters: SessionCommandParameters[Command]]
	): Promise<boolean> {
		return this.sendMutation('POST', { action: command, ...parameters[0] });
	}

	async saveSettings(settings: SessionSettingsInput): Promise<boolean> {
		return this.sendMutation('PUT', settings);
	}

	/** Applies a market overview returned by another endpoint, such as the demo-data loader. */
	applyServerState(overview: SessionOverview): void {
		this.requestRevision += 1;
		this._currentState = overview;
		this._error = null;
	}

	private async sendMutation(method: 'POST' | 'PUT', body: object): Promise<boolean> {
		const revision = ++this.requestRevision;

		this._pendingCommands += 1;
		this._error = null;

		try {
			const headers = new Headers(await this.requestHeaders());

			headers.set('Content-Type', 'application/json');

			const response = await fetch('/api/market', {
				method,
				headers,
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				throw await responseError(response, 'Failed to update the market session');
			}

			const overview = (await response.json()) as SessionOverview;

			if (revision === this.requestRevision) {
				this._currentState = overview;
			}

			return true;
		} catch (cause) {
			if (revision === this.requestRevision) {
				this._error = errorFrom(cause, 'Failed to update the market session');
			}

			return false;
		} finally {
			this._pendingCommands -= 1;
		}
	}

	private async poll(): Promise<void> {
		// A command returns the authoritative post-transition overview. Do not let a GET that starts
		// while the command is in flight race that response and replace it with an older snapshot.
		if (this.isSending) {
			return;
		}

		try {
			await this.getStatus();
		} catch {
			// Polling errors are observable through `error`; a timer callback must not reject.
		}
	}

	private async fetchStatus(): Promise<void> {
		const revision = ++this.requestRevision;

		this._isLoading = true;
		this._error = null;

		try {
			const response = await fetch('/api/market', { headers: await this.requestHeaders() });

			if (!response.ok) {
				throw await responseError(response, 'Failed to fetch market status');
			}

			const overview = (await response.json()) as SessionOverview;

			if (revision === this.requestRevision) {
				this._currentState = overview;
			}
		} catch (cause) {
			const error = errorFrom(cause, 'Failed to fetch market status');

			if (revision === this.requestRevision) {
				this._error = error;
			}
			throw error;
		} finally {
			this._isLoading = false;
		}
	}
}

function errorFrom(cause: unknown, fallback: string): Error {
	return cause instanceof Error ? cause : new Error(fallback);
}

async function responseError(response: Response, fallback: string): Promise<Error> {
	try {
		const body = (await response.json()) as { error?: unknown };

		if (typeof body.error === 'string' && body.error) {
			return new Error(body.error);
		}
	} catch {
		// An error response is not required to contain JSON.
	}

	return new Error(fallback);
}
