import { app, dialog, Menu, type MenuItemConstructorOptions } from 'electron';

import type { CheckInWindow } from './check-in-window.ts';
import type { SavedSignIn } from './saved-sign-in.ts';
import type { Settings } from './settings.ts';
import type { Updates, UpdateState } from './updates.ts';

/** The update line in the app menu: what the updater is doing, and what you can do about it. */
function updateItem(updates: Updates): MenuItemConstructorOptions {
	const state: UpdateState = updates.state;

	switch (state.kind) {
		case 'off':
			return { label: 'Updates Are Off in This Build', enabled: false };
		case 'checking':
			return { label: 'Checking for Updates…', enabled: false };
		case 'downloading':
			return { label: `Downloading Version ${state.version}…`, enabled: false };
		case 'ready':
			return {
				label: `Restart to Install Version ${state.version}`,
				click: () => updates.restartToInstall(),
			};
		case 'idle':
		case 'failed':
			return { label: 'Check for Updates', click: () => void updates.check() };
	}
}

/**
 * The menu bar: the standard macOS menus, with About showing versions and the site, the app menu
 * following the updater, and the Window menu folding the print station's panel away and back.
 */
export class ApplicationMenu {
	private readonly settings: Settings;
	private readonly saved: SavedSignIn;
	private readonly window: CheckInWindow;
	private readonly updates: Updates;

	constructor(settings: Settings, saved: SavedSignIn, window: CheckInWindow, updates: Updates) {
		this.settings = settings;
		this.saved = saved;
		this.window = window;
		this.updates = updates;
	}

	/** Builds the menu bar again from the current state; call whenever that changes. */
	install(): void {
		const template: MenuItemConstructorOptions[] = [
			{
				label: app.name,
				submenu: [
					{ label: `About ${app.name}`, click: () => this.showAbout() },
					updateItem(this.updates),
					{ type: 'separator' },
					{ label: 'Forget Saved Password…', click: () => void this.forgetPassword() },
					{ type: 'separator' },
					{ role: 'hide' },
					{ role: 'hideOthers' },
					{ role: 'unhide' },
					{ type: 'separator' },
					{ role: 'quit' },
				],
			},
			{ role: 'editMenu' },
			{
				label: 'View',
				submenu: [
					{ role: 'reload' },
					{ role: 'forceReload' },
					{ role: 'toggleDevTools' },
					{ type: 'separator' },
					{ role: 'resetZoom' },
					{ role: 'zoomIn' },
					{ role: 'zoomOut' },
					{ type: 'separator' },
					{ role: 'togglefullscreen' },
				],
			},
			{
				role: 'windowMenu',
				submenu: [
					{ role: 'minimize' },
					{ role: 'zoom' },
					{ type: 'separator' },
					{
						label: 'Show Printing Station',
						type: 'checkbox',
						checked: this.window.isPanelWanted,
						accelerator: 'CmdOrCtrl+Shift+P',
						click: (item) => this.window.setPanelWanted(item.checked),
					},
					{ type: 'separator' },
					{ role: 'front' },
				],
			},
		];

		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	}

	/** The version, and what a test needs reported back: which engine, against which site. */
	private showAbout(): void {
		const { state } = this.updates;

		void dialog.showMessageBox({
			type: 'info',
			message: `${app.name} ${app.getVersion()}`,
			detail: [
				`Site: ${this.settings.site} (${this.settings.environment})`,
				state.kind === 'failed' ? `Last update check failed: ${state.message}` : null,
				`Electron ${process.versions.electron}`,
				`Chromium ${process.versions.chrome}`,
				`macOS ${process.getSystemVersion()} (${process.arch})`,
			]
				.filter((line) => line !== null)
				.join('\n'),
		});
	}

	private async forgetPassword(): Promise<void> {
		if (!this.saved.exists) {
			await dialog.showMessageBox({ type: 'info', message: 'No password is saved.' });

			return;
		}

		const { response } = await dialog.showMessageBox({
			type: 'warning',
			message: 'Forget the saved password?',
			detail: 'The next sign-in has to be typed in full.',
			buttons: ['Forget Password', 'Cancel'],
			defaultId: 1,
			cancelId: 1,
		});

		if (response === 0) {
			this.saved.forget();
		}
	}
}
