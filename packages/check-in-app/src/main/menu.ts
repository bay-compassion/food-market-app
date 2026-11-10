import { app, dialog, Menu, type MenuItemConstructorOptions } from 'electron';

import type { Site } from './site.ts';

/** What a spike needs to report back: which engine is actually running on this Mac. */
function showVersions(site: Site): void {
	void dialog.showMessageBox({
		type: 'info',
		message: app.name,
		detail: [
			`Site: ${site.origin}`,
			`Electron ${process.versions.electron}`,
			`Chromium ${process.versions.chrome}`,
			`macOS ${process.getSystemVersion()} (${process.arch})`,
		].join('\n'),
	});
}

/** The menu bar: the standard macOS menus, with About showing versions and the site. */
export function installApplicationMenu(site: Site): void {
	const template: MenuItemConstructorOptions[] = [
		{
			label: app.name,
			submenu: [
				{ label: `About ${app.name}`, click: () => showVersions(site) },
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
		{ role: 'windowMenu' },
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
