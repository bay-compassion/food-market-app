// Compassion Food Market, the check-in iMac's app: one window holding the queue desk and, in a panel beside it, the print
// station, signed in together.

import path from 'node:path';

import { app } from 'electron';

import icon from '../../resources/icon.png?asset';
import { CheckInWindow } from './check-in-window.ts';
import { installApplicationMenu } from './menu.ts';
import { PrintStation } from './print-station.ts';
import { QueueDesk } from './queue-desk.ts';
import { SavedSignIn } from './saved-sign-in.ts';
import { Settings } from './settings.ts';
import { SignInAutofill } from './sign-in-autofill.ts';

const settings = Settings.load();

// Before anything reads the data folder: the name picks it, and with it the session, the saved
// password, and the one-copy lock, so a development copy never collides with the real app.
app.setName(settings.name);
app.setPath('userData', path.join(app.getPath('appData'), settings.name));

const saved = new SavedSignIn();
const autofill = new SignInAutofill(settings, saved);

function start(): void {
	// A packaged app takes its icon from the bundle; in development the Dock would otherwise show
	// Electron's.
	if (!app.isPackaged) {
		app.dock?.setIcon(icon);
	}

	// The views need the app to be ready, and each needs the window to lay it out again.
	const printStation = new PrintStation(settings, () => window.layout());
	const queueDesk = new QueueDesk(settings, () => printStation.afterSignIn());
	const window = new CheckInWindow(settings, queueDesk, printStation);

	app.on('second-instance', () => window.show());
	app.on('activate', () => window.show());

	autofill.register();
	installApplicationMenu(settings, saved, window);
	queueDesk.start(window.baseWindow, autofill);
	printStation.start();
}

// One copy only: a second would run a second print station, and every tag would print twice.
// Opening the app again brings the running one forward.
if (app.requestSingleInstanceLock()) {
	void app.whenReady().then(start);
} else {
	app.quit();
}
