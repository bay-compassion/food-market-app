import { runInAction } from 'mobx';

import { QueueBoard, type QueueBoardState } from '../models/queue-board.ts';
import type { KioskApi, KioskUnlockFailure } from '../services/kiosk-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { PageVisibilityPoller } from '../services/page-visibility-poller.ts';

export type KioskStoreOptions = {
	api: Pick<KioskApi, 'queueBoard' | 'unlock'>;
	storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	/** How often to read the board while a session is under way. */
	pollIntervalMs?: number;
	/** How often while it is idle (`QueueBoard.isIdle`): no session, one not yet open, or one over. */
	idlePollIntervalMs?: number;
};

/** Where an unlocked display keeps its token. The display's own, never shared with the guest app. */
export const kioskTokenStorageKey = 'bay-compassion-kiosk-token';

const defaultPollIntervalMs = 5_000;
/**
 * Longer than the few idle minutes after which the database suspends, so a display left on
 * overnight, or between market days, lets it sleep.
 */
const defaultIdlePollIntervalMs = 10 * 60_000;

/**
 * The room display's state: whether it is unlocked, the last queue board it read, and why the
 * latest read failed, if it did. Screen-lifetime rather than on the root store — only `/kiosk`
 * reads it, and it should stop polling the moment that screen goes away.
 *
 * A locked display polls nothing at all: the server would refuse it, and every refusal is still a
 * request that keeps the backend awake.
 */
export class KioskStore {
	private _token: string | null;
	private _state: QueueBoardState | null = null;
	private _connectionLost = false;
	private _isUnlocking = false;
	private _unlockFailure: KioskUnlockFailure | null = null;
	private readonly api: KioskStoreOptions['api'];
	private readonly storage: NonNullable<KioskStoreOptions['storage']>;
	private readonly pollIntervalMs: number;
	private readonly idlePollIntervalMs: number;
	private readonly poller: PageVisibilityPoller;
	private request: Promise<void> | null = null;

	/** `null` until the first successful read. A later failure keeps the last board on screen. */
	get board(): QueueBoard | null {
		return this._state ? new QueueBoard(this._state) : null;
	}

	/** No token, or the server refused the one it had: a worker has to unlock it. */
	get isLocked(): boolean {
		return this._token === null;
	}

	/** The last read failed for a reason the next poll may fix. */
	get isReconnecting(): boolean {
		return this._connectionLost;
	}

	get isLoading(): boolean {
		return !this.isLocked && this._state === null && !this._connectionLost;
	}

	get isUnlocking(): boolean {
		return this._isUnlocking;
	}

	/** Why the last code typed in was not accepted, until the next try. */
	get unlockFailure(): KioskUnlockFailure | null {
		return this._unlockFailure;
	}

	constructor(options: KioskStoreOptions) {
		this.api = options.api;
		this.storage = options.storage ?? window.localStorage;
		this.pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;
		this.idlePollIntervalMs = options.idlePollIntervalMs ?? defaultIdlePollIntervalMs;
		this._token = this.storage.getItem(kioskTokenStorageKey);
		this.poller = new PageVisibilityPoller(
			() => void this.refresh(),
			this.pollIntervalMs,
			() => {},
		);

		makeReactive(this, {
			api: false,
			storage: false,
			pollIntervalMs: false,
			idlePollIntervalMs: false,
			poller: false,
			request: false,
		});
	}

	/** Starts polling, if there is a token to poll with; `unlock` starts it otherwise. */
	start(): void {
		if (!this.isLocked) {
			this.poller.start();
		}
	}

	/** Reads the board once. A read already in flight is shared rather than doubled up. */
	refresh(): Promise<void> {
		const token = this._token;

		if (token === null) {
			return Promise.resolve();
		}

		this.request ??= this.api.queueBoard(token).then((result) => {
			runInAction(() => {
				this.request = null;

				if (result.ok) {
					this._state = result.state;
					this._connectionLost = false;
					this.poller.setIntervalMs(
						this.board?.isIdle ? this.idlePollIntervalMs : this.pollIntervalMs,
					);
				} else if (result.failure === 'locked') {
					this.lock();
				} else {
					this._connectionLost = true;
				}
			});
		});

		return this.request;
	}

	/** Trades a worker's code for a token, keeps it, and starts reading the board. */
	async unlock(code: string): Promise<void> {
		this._isUnlocking = true;
		this._unlockFailure = null;

		const outcome = await this.api.unlock(code);

		runInAction(() => {
			this._isUnlocking = false;

			if (outcome.ok) {
				this._token = outcome.token;
				this.storage.setItem(kioskTokenStorageKey, outcome.token);
			} else {
				this._unlockFailure = outcome.failure;
			}
		});

		this.start();
	}

	[Symbol.dispose](): void {
		this.poller.stop();
	}

	private lock(): void {
		this.poller.stop();
		this._token = null;
		this._state = null;
		this._connectionLost = false;
		this.storage.removeItem(kioskTokenStorageKey);
	}
}
