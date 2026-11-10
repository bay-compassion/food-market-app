import {
	type BaseWindow,
	dialog,
	ipcMain,
	type IpcMainEvent,
	type IpcMainInvokeEvent,
	type WebContents,
} from 'electron';

import { type SignInCredential, signInChannels, type SubmittedSignIn } from '../shared/sign-in.ts';
import type { SavedSignIn } from './saved-sign-in.ts';
import type { Settings } from './settings.ts';

/**
 * Fills the saved sign-in into Auth0's sign-in page, and offers to save one typed there.
 *
 * Only the sign-in page's own frame is answered or listened to: the preload runs on every page the
 * window loads, and the password must never reach the app's pages or anything else. A typed
 * password is offered for saving only once the window is back on the app, so a mistyped one, which
 * Auth0 turns away, is never kept.
 */
export class SignInAutofill {
	private readonly settings: Settings;
	private readonly saved: SavedSignIn;
	/** The email from the first page, waiting for the password page. */
	private username: string | null = null;
	/** A sign-in submitted but not yet known to have worked. */
	private submitted: SignInCredential | null = null;

	constructor(settings: Settings, saved: SavedSignIn) {
		this.settings = settings;
		this.saved = saved;
	}

	register(): void {
		ipcMain.handle(signInChannels.saved, (event) =>
			this.isSignInPage(event) ? this.saved.load() : null,
		);
		ipcMain.on(signInChannels.submitted, (event, submission: unknown) => {
			if (this.isSignInPage(event) && isSubmittedSignIn(submission)) {
				this.receive(submission);
			}
		});
	}

	/** Offers to save a sign-in, in `window`, once `page` arrives back at the app after one. */
	watch(page: WebContents, window: BaseWindow): void {
		page.on('did-navigate', (_event, url) => {
			if (new URL(url).origin === this.settings.site && this.submitted) {
				const credential = this.submitted;

				this.submitted = null;
				void this.offerToSave(window, credential);
			}
		});
	}

	private isSignInPage(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
		const url = event.senderFrame?.url;

		return url !== undefined && URL.canParse(url) && new URL(url).origin === this.settings.signIn;
	}

	private receive({ username, password }: SubmittedSignIn): void {
		if (username) {
			this.username = username;
		}

		if (password && this.username) {
			this.submitted = { username: this.username, password };
		}
	}

	private async offerToSave(window: BaseWindow, credential: SignInCredential): Promise<void> {
		const current = this.saved.load();

		if (current?.username === credential.username && current.password === credential.password) {
			return;
		}

		const { response } = await dialog.showMessageBox(window, {
			type: 'question',
			message: current
				? `Update the saved password for ${credential.username}?`
				: `Save the password for ${credential.username}?`,
			detail:
				'It is kept encrypted, with its key in this Mac’s Keychain, and filled in the next time Check-In asks you to sign in.',
			buttons: [current ? 'Update Password' : 'Save Password', 'Not Now'],
			defaultId: 0,
			cancelId: 1,
		});

		if (response === 0) {
			this.saved.save(credential);
		}
	}
}

function isSubmittedSignIn(value: unknown): value is SubmittedSignIn {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const { username, password } = value as Record<string, unknown>;

	return (
		(username === undefined || typeof username === 'string') &&
		(password === undefined || typeof password === 'string')
	);
}
