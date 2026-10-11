import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, StorageService } from '../services/storage.service.ts';

/**
 * The guided tour of the home screen: whether it is running, and whether this device has already
 * been through it.
 *
 * A first-time guest is offered it once, right after choosing a language; it can be skipped at any
 * step, and replayed from the app bar menu. Finishing and skipping both count as having seen it,
 * since a guest who skipped it knows where to find it again.
 */
export class GuestTourStore {
	private _isRunning = false;
	private _hasBeenSeen: boolean;

	constructor(private readonly storage: Pick<StorageService, 'get' | 'set'> | null) {
		this._hasBeenSeen = storage?.get(StorageKey.GUEST_TOUR_SEEN) ?? false;

		return makeReactive(this, { storage: false });
	}

	get isRunning(): boolean {
		return this._isRunning;
	}

	get hasBeenSeen(): boolean {
		return this._hasBeenSeen;
	}

	/** Starts the tour from its first step, whether or not it has been seen. */
	start(): void {
		this._isRunning = true;
	}

	/** Starts the tour only for a guest who has never finished or skipped it. */
	offer(): void {
		if (!this._hasBeenSeen) {
			this.start();
		}
	}

	/** Ends the tour, finished or skipped, and remembers that this device has seen it. */
	finish(): void {
		this._isRunning = false;
		this._hasBeenSeen = true;
		this.storage?.set(StorageKey.GUEST_TOUR_SEEN, true);
	}
}
