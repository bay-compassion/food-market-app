import { app, dialog, Menu, type MenuItemConstructorOptions } from 'electron';

import type { CheckInWindow } from './check-in-window.ts';
import type { SavedSignIn } from './saved-sign-in.ts';
import type { Settings } from './settings.ts';

/** What a spike needs to report back: which engine is running, against which site. */
function showVersions(settings: Settings): void {
	void dialog.showMessageBox({
		type: 'info',
		message: app.name,
		detail: [
			`Site: ${settings.site} (${settings.environment})`,
			`Electron ${process.versions.electron}`,
			`Chromium ${process.versions.chrome}`,
			`macOS ${process.getSystemVersion()} (${process.arch})`,
		].join('\n'),
	});
}

async function forgetPassword(saved: SavedSignIn): Promise<void> {
	if (!saved.exists) {
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
		saved.forget();
	}
}

/**
 * The menu bar: the standard macOS menus, with About showing versions and the site, and the Window
 * menu folding the print station's panel away and back.
 */
export function installApplicationMenu(
	settings: Settings,
	saved: SavedSignIn,
	window: CheckInWindow,
): void {
	const template: MenuItemConstructorOptions[] = [
		{
			label: app.name,
			submenu: [
				{ label: `About ${app.name}`, click: () => showVersions(settings) },
				{ type: 'separator' },
				{ label: 'Forget Saved Password…', click: () => void forgetPassword(saved) },
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
					checked: true,
					accelerator: 'CmdOrCtrl+Shift+P',
					click: (item) => window.setPanelWanted(item.checked),
				},
				{ type: 'separator' },
				{ role: 'front' },
			],
		},
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
