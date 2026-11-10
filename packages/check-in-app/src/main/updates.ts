import { app, autoUpdater as nativeUpdater } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { Settings } from './settings.ts';

type Feed = Parameters<typeof autoUpdater.setFeedURL>[0];

/** How often a running app looks for a release, on top of once at launch. */
const checkEveryMs = 4 * 60 * 60 * 1000;

export type UpdateState =
	| { kind: 'off' }
	| { kind: 'idle' }
	| { kind: 'checking' }
	| { kind: 'downloading'; version: string }
	| { kind: 'ready'; version: string }
	| { kind: 'failed'; message: string };

/**
 * Keeps the app up to date from the repository's GitHub Releases (see the README's "Releasing").
 *
 * It downloads a new release in the background and installs it when the app next quits, or
 * sooner from the menu. It never restarts the app on its own: the app is the market's print
 * station, and a restart during a market would take printing offline. macOS installs an update
 * only if it is signed by the same certificate as the app that is running, so a build signed ad
 * hoc (a local `pnpm build`) neither updates nor is offered as one.
 */
export class Updates {
	private readonly settings: Settings;
	private readonly onChange: () => void;
	private _state: UpdateState = { kind: 'off' };

	/** `onChange` runs whenever `state` does, so the menu can follow it. */
	constructor(settings: Settings, onChange: () => void) {
		this.settings = settings;
		this.onChange = onChange;
	}

	get state(): UpdateState {
		return this._state;
	}

	/** Starts checking, in a packaged app whose settings turn updates on. Once per app. */
	start(): void {
		const feed = this.feed;

		if (!app.isPackaged || !feed) {
			return;
		}

		autoUpdater.setFeedURL(feed);
		autoUpdater.autoDownload = true;
		autoUpdater.autoInstallOnAppQuit = true;
		autoUpdater.logger = console;

		autoUpdater.on('checking-for-update', () => this.set({ kind: 'checking' }));
		autoUpdater.on('update-not-available', () => this.set({ kind: 'idle' }));
		autoUpdater.on('update-available', ({ version }) => this.set({ kind: 'downloading', version }));
		autoUpdater.on('update-downloaded', ({ version }) => this.set({ kind: 'ready', version }));
		autoUpdater.on('error', (error) => this.set({ kind: 'failed', message: error.message }));

		this.set({ kind: 'idle' });
		void this.check();
		setInterval(() => void this.check(), checkEveryMs);
	}

	/** Looks for a release now. Failures land in `state`, not here. */
	async check(): Promise<void> {
		if (this._state.kind === 'off' || this._state.kind === 'ready') {
			return;
		}

		try {
			await autoUpdater.checkForUpdates();
		} catch {
			// Reported through the `error` event.
		}
	}

	/** Quits and installs the downloaded release, then opens the app again. */
	restartToInstall(): void {
		if (this._state.kind === 'ready') {
			autoUpdater.quitAndInstall();
		}
	}

	/**
	 * Runs `listener` just before the app quits to install an update. On macOS electron-updater hands
	 * the install to Electron's own updater, which is what announces it.
	 */
	onBeforeInstall(listener: () => void): void {
		nativeUpdater.on('before-quit-for-update', listener);
	}

	/** GitHub Releases, or, for testing, a plain web folder named by `updates.url`. */
	private get feed(): Feed | null {
		const { updates } = this.settings;

		if (!updates.enabled) {
			return null;
		}

		return updates.url
			? { provider: 'generic', url: updates.url }
			: { provider: 'github', owner: updates.owner, repo: updates.repo };
	}

	private set(state: UpdateState): void {
		this._state = state;
		this.onChange();
	}
}
