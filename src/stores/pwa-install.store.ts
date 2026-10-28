import { runInAction } from 'mobx';

import {
	BrowserInstallEnvironment,
	type InstallEnvironment,
	type InstallPlatform,
} from '../pwa/install-environment';
import { makeReactive } from '../services/make-reactive';
import { StorageKey, type StorageService } from '../services/storage.service';

export interface InstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaInstallStoreOptions = { environment?: InstallEnvironment; disabled?: boolean };
const dismissalMs = 7 * 24 * 60 * 60_000;

/** An optional shortcut after lottery entry; it never changes registration or SMS consent. */
export class PwaInstallStore {
	private promptEvent: InstallPromptEvent | null = null;
	private hasPrompt = false;
	private installed: boolean;
	private dismissedUntil: number;
	private now = Date.now();
	private started = false;
	private environment: InstallEnvironment;
	isInstalling = false;
	instructionsOpen = false;

	constructor(
		private readonly storage: Pick<StorageService, 'get' | 'set'>,
		private readonly options: PwaInstallStoreOptions = {},
	) {
		this.environment = options.environment ?? new BrowserInstallEnvironment();
		this.installed = this.environment.isStandalone;
		this.dismissedUntil = storage.get(StorageKey.PWA_INSTALL_DISMISSED_UNTIL) ?? 0;

		return makeReactive(this, {
			storage: false,
			environment: false,
			options: false,
			promptEvent: false,
		});
	}

	get platform(): InstallPlatform {
		return this.environment.platform;
	}

	get canOffer(): boolean {
		return (
			this.started &&
			!this.options.disabled &&
			!this.installed &&
			this.dismissedUntil <= this.now &&
			(this.hasPrompt || this.environment.canInstallOnIos)
		);
	}

	start(): void {
		if (this.started || this.options.disabled) {
			return;
		}
		this.started = true;
		this.environment.events.addEventListener('beforeinstallprompt', this.receivePrompt);
		this.environment.events.addEventListener('appinstalled', this.onInstalled);
		this.environment.events.addEventListener('visibilitychange', this.refreshTime);
		this.environment.events.addEventListener('pageshow', this.refreshTime);
		this.environment.displayMode?.addEventListener('change', this.onDisplayModeChange);
		this.environment.registerServiceWorker();
	}

	dismiss(): void {
		this.dismissedUntil = Date.now() + dismissalMs;

		try {
			this.storage.set(StorageKey.PWA_INSTALL_DISMISSED_UNTIL, this.dismissedUntil);
		} catch {
			// Dismiss for this visit even if the browser cannot remember the choice.
		}
	}

	clearHandoff(): void {
		if (!this.options.disabled) {
			this.environment.clearHandoff();
		}
	}

	closeInstructions(): void {
		this.instructionsOpen = false;
	}

	/** Called directly by a tap, before any await, so native prompt() retains user activation. */
	async install(): Promise<boolean> {
		if (!this.canOffer || this.isInstalling) {
			return true;
		}

		if (!this.promptEvent) {
			if (!this.environment.prepareHandoff()) {
				return false;
			}
			this.instructionsOpen = true;

			return true;
		}

		const event = this.promptEvent;

		this.promptEvent = null;
		this.hasPrompt = false;
		this.isInstalling = true;

		try {
			await event.prompt();
			const choice = await event.userChoice;

			runInAction(() => {
				if (choice.outcome === 'dismissed') {
					this.dismiss();
				}
				// Acceptance is not proof installation finished; appinstalled confirms that.
			});

			return true;
		} catch {
			return false;
		} finally {
			runInAction(() => {
				this.isInstalling = false;
			});
		}
	}

	private receivePrompt = (event: Event): void => {
		if (!('prompt' in event) || typeof event.prompt !== 'function' || !('userChoice' in event)) {
			return;
		}
		event.preventDefault();
		this.promptEvent = event as InstallPromptEvent;
		this.hasPrompt = true;
	};

	private refreshTime = (): void => {
		this.now = Date.now();
	};

	private onInstalled = (): void => {
		this.installed = true;
		this.promptEvent = null;
		this.hasPrompt = false;
		this.instructionsOpen = false;
	};

	private onDisplayModeChange = (): void => {
		this.installed = this.environment.isStandalone;

		if (this.installed) {
			this.closeInstructions();
		}
	};

	[Symbol.dispose](): void {
		this.environment.events.removeEventListener('beforeinstallprompt', this.receivePrompt);
		this.environment.events.removeEventListener('appinstalled', this.onInstalled);
		this.environment.events.removeEventListener('visibilitychange', this.refreshTime);
		this.environment.events.removeEventListener('pageshow', this.refreshTime);
		this.environment.displayMode?.removeEventListener('change', this.onDisplayModeChange);
		runInAction(() => {
			this.started = false;
		});
	}
}
