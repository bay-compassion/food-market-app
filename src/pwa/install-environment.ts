import { HomeScreenHandoff } from './home-screen-handoff';

export type InstallPlatform = 'android' | 'ios' | 'other';

/** Browser capabilities used by the installation store; stories inject a per-store substitute. */
export interface InstallEnvironment {
	readonly platform: InstallPlatform;
	readonly events: EventTarget;
	readonly displayMode: MediaQueryList | null;
	readonly isStandalone: boolean;
	readonly canInstallOnIos: boolean;
	prepareHandoff: (this: void) => boolean;
	clearHandoff: (this: void) => void;
	registerServiceWorker: (this: void) => void;
}

export class BrowserInstallEnvironment implements InstallEnvironment {
	readonly events = window;
	readonly displayMode = window.matchMedia?.('(display-mode: standalone)') ?? null;

	get platform(): InstallPlatform {
		if (
			/iPhone|iPad|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
		) {
			return 'ios';
		}

		return /Android/.test(navigator.userAgent) ? 'android' : 'other';
	}

	get isStandalone(): boolean {
		return (
			this.displayMode?.matches === true ||
			('standalone' in navigator && navigator.standalone === true)
		);
	}

	get canInstallOnIos(): boolean {
		const agent = navigator.userAgent;
		const version = /(?:iPhone OS|CPU OS) (\d+)_(\d+)/.exec(agent);
		const major = Number(version?.[1]);
		const minor = Number(version?.[2]);
		const safari = /Version\/.*Safari\//.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);

		// Earlier iOS releases do not copy the handoff cookie. iPad desktop mode's UA omits the
		// OS version, so don't guess whether that browser can preserve an existing visit.
		return navigator.cookieEnabled && safari && (major > 17 || (major === 17 && minor >= 2));
	}

	prepareHandoff(): boolean {
		return new HomeScreenHandoff().prepare();
	}

	clearHandoff(): void {
		new HomeScreenHandoff().clear();
	}

	registerServiceWorker(): void {
		if ('serviceWorker' in navigator && window.isSecureContext) {
			void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
		}
	}
}
