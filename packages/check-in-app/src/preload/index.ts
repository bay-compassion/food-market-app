// Runs in every page the windows load, isolated from the page's own scripts. The main process
// checks who is asking: it answers the saved sign-in only to Auth0's sign-in page, and prints only
// for the print station's window.
//
// Built as CommonJS: a sandboxed preload can't be an ES module.

import { contextBridge, ipcRenderer } from 'electron';

import {
	type CheckInAppBridge,
	type LabelSize,
	printStationChannels,
} from '../shared/print-station.ts';
import { type SignInCredential, signInChannels, type SubmittedSignIn } from '../shared/sign-in.ts';

// What tells the web app it is running in Check-In, and how its print station prints here.
const bridge: CheckInAppBridge = {
	printer: {
		print: (label: LabelSize) => ipcRenderer.invoke(printStationChannels.print, label),
	},
};

contextBridge.exposeInMainWorld('checkInApp', bridge);

// By name: Auth0's email page also has an unnamed password field, a trap that only a password
// manager would fill, and filling it would fail the sign-in.
const usernameField = 'input[name="username"]';
const passwordField = 'input[name="password"]';

/** Sets a field the way typing would, so the page's scripts see the change. */
function fill(field: HTMLInputElement | null, value: string): void {
	if (!field || field.value) {
		return;
	}

	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	field.dispatchEvent(new Event('change', { bubbles: true }));
}

function submission(form: HTMLFormElement): SubmittedSignIn {
	return {
		username: form.querySelector<HTMLInputElement>(usernameField)?.value || undefined,
		password: form.querySelector<HTMLInputElement>(passwordField)?.value || undefined,
	};
}

window.addEventListener('DOMContentLoaded', () => {
	if (!document.querySelector(`${usernameField}, ${passwordField}`)) {
		return;
	}

	document.addEventListener(
		'submit',
		(event) => {
			if (event.target instanceof HTMLFormElement) {
				ipcRenderer.send(signInChannels.submitted, submission(event.target));
			}
		},
		true,
	);

	void (ipcRenderer.invoke(signInChannels.saved) as Promise<SignInCredential | null>).then(
		(saved) => {
			if (saved) {
				fill(document.querySelector(`${usernameField}:not([type="hidden"])`), saved.username);
				fill(document.querySelector(passwordField), saved.password);
			}
		},
	);
});
