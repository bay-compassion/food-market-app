import { runInAction } from 'mobx';

import { QueueBoard, type QueueBoardState } from '../models/queue-board.ts';
import type { KioskApi, QueueBoardFailure } from '../services/kiosk-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { PageVisibilityPoller } from '../services/page-visibility-poller.ts';

export type KioskStoreOptions = {
	api: Pick<KioskApi, 'queueBoard'>;
	pollIntervalMs?: number;
};

const defaultPollIntervalMs = 5_000;

/**
 * The room display's state: the last queue board it read, and why the latest read failed, if it
 * did. Screen-lifetime rather than on the root store — only `/kiosk` reads it, and it should stop
 * polling the moment that screen goes away.
 */
export class KioskStore {
	private _state: QueueBoardState | null = null;
	private _failure: QueueBoardFailure | null = null;
	private readonly api: Pick<KioskApi, 'queueBoard'>;
	private readonly poller: PageVisibilityPoller;
	private request: Promise<void> | null = null;

	/** `null` until the first successful read. A later failure keeps the last board on screen. */
	get board(): QueueBoard | null {
		return this._state ? new QueueBoard(this._state) : null;
	}

	get failure(): QueueBoardFailure | null {
		return this._failure;
	}

	get isLoading(): boolean {
		return this._state === null && this._failure === null;
	}

	constructor(options: KioskStoreOptions) {
		this.api = options.api;
		this.poller = new PageVisibilityPoller(
			() => void this.refresh(),
			options.pollIntervalMs ?? defaultPollIntervalMs,
			() => {},
		);

		makeReactive(this, { api: false, poller: false, request: false });
	}

	start(): void {
		this.poller.start();
	}

	/** Reads the board once. A read already in flight is shared rather than doubled up. */
	refresh(): Promise<void> {
		this.request ??= this.api.queueBoard().then((result) => {
			runInAction(() => {
				if (result.ok) {
					this._state = result.state;
					this._failure = null;
				} else {
					this._failure = result.failure;
				}
				this.request = null;
			});
		});

		return this.request;
	}

	[Symbol.dispose](): void {
		this.poller.stop();
	}
}
