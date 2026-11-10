import path from 'node:path';

import { app, type WebPreferences } from 'electron';

/**
 * Every window loads the deployed app or Auth0, so none gets Node: each is sandboxed and isolated,
 * and reaches the main process only through the preload's few, checked calls.
 */
export function windowPreferences(): WebPreferences {
	return {
		preload: path.join(app.getAppPath(), 'out/preload/index.cjs'),
		contextIsolation: true,
		sandbox: true,
		nodeIntegration: false,
	};
}
