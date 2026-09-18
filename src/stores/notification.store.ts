import { makeReactive } from '../services/make-reactive.ts';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/** A short message about something that just happened, shown briefly and then gone. */
export type Notification = {
	id: number;
	message: string;
	severity: NotificationSeverity;
};

/**
 * Messages waiting to be shown as toasts.
 *
 * notistack's own `enqueueSnackbar` only exists once its provider has mounted, so a store calling
 * it directly would throw in a unit test and drop anything raised before the first render. This
 * holds the messages instead, and `NotificationToasts` — mounted once, from the shell — hands each
 * one to notistack and takes it back out. A caller never touches the toast library at all.
 */
export class NotificationStore {
	private _pending: Notification[] = [];
	private nextId = 1;

	constructor() {
		return makeReactive(this, { nextId: false });
	}

	/** Messages raised but not yet shown, oldest first. */
	get pending(): readonly Notification[] {
		return this._pending;
	}

	notify(message: string, severity: NotificationSeverity = 'info'): void {
		this._pending.push({ id: this.nextId++, message, severity });
	}

	success(message: string): void {
		this.notify(message, 'success');
	}

	error(message: string): void {
		this.notify(message, 'error');
	}

	/** Removes and returns everything pending, for the toaster to show. */
	take(): Notification[] {
		const taken = this._pending;

		this._pending = [];

		return taken;
	}
}
