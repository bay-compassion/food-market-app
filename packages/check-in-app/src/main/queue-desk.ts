import { type BaseWindow, WebContentsView } from 'electron';

import type { Settings } from './settings.ts';
import type { SignInAutofill } from './sign-in-autofill.ts';
import { windowPreferences } from './window-preferences.ts';

/** Chromium's code for a load cut short by another navigation, which is not a failure. */
const abortedLoad = -3;

export type QueueDeskEvents = {
	/** Runs each time the queue desk comes back to the app after leaving it to sign in. */
	onSignedIn(): void;
	/** Runs whenever `isStranded` or `canGoBack` may have changed. */
	onChange(): void;
};

/** The queue desk, `/queue`: the main part of the window, where a volunteer works and signs in. */
export class QueueDesk {
	readonly view: WebContentsView;
	private readonly settings: Settings;
	private awayFromSite = false;
	private failedToLoad = false;

	constructor(settings: Settings, events: QueueDeskEvents) {
		this.settings = settings;
		this.view = new WebContentsView({ webPreferences: windowPreferences() });

		const { webContents } = this.view;

		webContents.on('did-navigate', (_event, url) => {
			const onSite = new URL(url).origin === settings.site;

			if (onSite && this.awayFromSite) {
				events.onSignedIn();
			}

			this.awayFromSite = !onSite;
			this.failedToLoad = false;
			events.onChange();
		});
		webContents.on('did-fail-load', (_event, errorCode, _description, _url, isMainFrame) => {
			if (isMainFrame && errorCode !== abortedLoad) {
				this.failedToLoad = true;
				events.onChange();
			}
		});
	}

	/** Opens the queue desk in `window`, offering to save a sign-in typed there. */
	start(window: BaseWindow, autofill: SignInAutofill): void {
		autofill.watch(this.view.webContents, window);
		this.startOver();
	}

	/**
	 * Whether a volunteer may need a way out: the desk is off the app, on Auth0's pages, whose error
	 * page has no link back, or its page failed to load. The window has no browser buttons of its own.
	 */
	get isStranded(): boolean {
		return this.awayFromSite || this.failedToLoad;
	}

	get canGoBack(): boolean {
		return this.view.webContents.navigationHistory.canGoBack();
	}

	goBack(): void {
		this.view.webContents.navigationHistory.goBack();
	}

	/** Opens `/queue` afresh, which starts a new sign-in if one is needed. */
	startOver(): void {
		void this.view.webContents.loadURL(this.settings.queueDesk);
	}
}
