import { makeReactive } from '../services/make-reactive.ts';

/** A question to put to whoever is holding the phone, and the words offered to answer it with. */
export type ConfirmationRequest = {
	/** The question itself, read as a heading. Short enough to take in at a glance. */
	question: string;
	/** Consequences worth spelling out, one paragraph each, shown under the question. */
	details?: string[];
	confirmLabel: string;
	dismissLabel: string;
	/**
	 * Marks the confirming button as destructive and opens with the dismissing one focused, for an
	 * action that takes something away.
	 */
	destructive?: boolean;
};

/**
 * The one confirmation the app is currently asking, and the answer it is waiting for.
 *
 * This stands in for `window.confirm`, which had exactly one property worth keeping: a caller
 * could ask inline and branch on the answer, without hoisting a piece of dialog state into the
 * component. `ask` keeps that shape as a promise, so a handler stays a single readable function
 * while the sheet itself renders once, from the app shell, against this state.
 */
export class ConfirmationStore {
	private _pending: ConfirmationRequest | null = null;
	/** The waiting `ask` promise's resolver, held only while a question is on screen. */
	private answer: ((confirmed: boolean) => void) | null = null;

	constructor() {
		return makeReactive(this, { answer: false });
	}

	/** The question being asked, or `null` when nothing is. */
	get pending(): ConfirmationRequest | null {
		return this._pending;
	}

	/** Resolves to whether the person confirmed. */
	ask(request: ConfirmationRequest): Promise<boolean> {
		// Nothing can be asked of someone still looking at an earlier question, so whatever is on
		// screen is withdrawn as declined — the only safe answer, since it was never agreed to.
		this.settle(false);
		this._pending = request;

		return new Promise<boolean>((resolve) => {
			this.answer = resolve;
		});
	}

	confirm(): void {
		this.settle(true);
	}

	/** Declines: the dismissing button, the backdrop, and Escape all land here. */
	dismiss(): void {
		this.settle(false);
	}

	private settle(confirmed: boolean): void {
		const answer = this.answer;

		this._pending = null;
		this.answer = null;
		answer?.(confirmed);
	}
}
