// The check-in iMac's app: the queue desk in one window. A spike for now, to learn whether it
// signs in and runs the queue desk on the iMac before the print station moves into it.

import { app, BrowserWindow } from 'electron';

import { installApplicationMenu } from './menu.ts';
import { Site } from './site.ts';

const site = Site.fromEnvironment(process.argv, process.env);

function openQueueDesk(): BrowserWindow {
	const window = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 800,
		minHeight: 600,
		show: false,
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false,
		},
	});

	window.once('ready-to-show', () => window.show());
	void window.loadURL(site.queueDesk);

	return window;
}

function focusQueueDesk(): void {
	const [window] = BrowserWindow.getAllWindows();

	if (!window) {
		openQueueDesk();

		return;
	}

	if (window.isMinimized()) {
		window.restore();
	}

	window.focus();
}

// One copy only. Once this window also hosts the print station, a second copy would print every
// tag twice; opening the app again just brings the running one forward.
if (app.requestSingleInstanceLock()) {
	app.on('second-instance', focusQueueDesk);
	app.on('activate', focusQueueDesk);

	// Not a top-level await: Electron holds `ready` back until an ES module main has finished
	// evaluating, so awaiting it here would wait forever.
	void app.whenReady().then(() => {
		installApplicationMenu(site);
		openQueueDesk();
	});
} else {
	app.quit();
}
