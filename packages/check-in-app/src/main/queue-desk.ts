import { type BaseWindow, WebContentsView } from 'electron';

import type { Settings } from './settings.ts';
import type { SignInAutofill } from './sign-in-autofill.ts';
import { windowPreferences } from './window-preferences.ts';

/** The queue desk, `/queue`: the main part of the window, where a volunteer works and signs in. */
export class QueueDesk {
	readonly view: WebContentsView;
	private readonly settings: Settings;

	/** `onSignedIn` runs each time the queue desk comes back to the app from the sign-in page. */
	constructor(settings: Settings, onSignedIn: () => void) {
		this.settings = settings;
		this.view = new WebContentsView({ webPreferences: windowPreferences() });

		let onSignInPage = false;

		this.view.webContents.on('did-navigate', (_event, url) => {
			const { origin } = new URL(url);

			if (origin === settings.signIn) {
				onSignInPage = true;
			} else if (origin === settings.site && onSignInPage) {
				onSignInPage = false;
				onSignedIn();
			}
		});
	}

	/** Opens the queue desk in `window`, offering to save a sign-in typed there. */
	start(window: BaseWindow, autofill: SignInAutofill): void {
		autofill.watch(this.view.webContents, window);
		void this.view.webContents.loadURL(this.settings.queueDesk);
	}
}
