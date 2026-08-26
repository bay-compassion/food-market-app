import {
	submitGuestRegistration,
	submitGuestSignup,
	type GuestRegistrationInput,
	type GuestRegistrationResult,
	type GuestSignupInput,
	type GuestSignupResult,
} from './guestVisitApi.ts';
import { makeReactive } from './make-reactive.ts';
import { StorageKey, StorageService } from './storage.service.ts';

export type GuestIdentity = Pick<GuestRegistrationInput, 'firstName' | 'lastName' | 'phone'>;

export type GuestStoreOptions = {
	request?: typeof fetch;
	storage?: Pick<StorageService, 'get' | 'set'> | null;
	register?: (
		payload: GuestRegistrationInput & { deviceToken: string | null },
	) => Promise<GuestRegistrationResult>;
	signUp?: (
		payload: GuestSignupInput & { deviceToken: string | null },
	) => Promise<GuestSignupResult>;
};

/** Owns the durable, device-local credential used for self-service guest registration. */
export class GuestStore {
	private _deviceToken: string | null;
	private _identity: GuestIdentity | null;
	private _notificationVisitToken: string | null = null;
	private _notificationSettingsLoaded = false;
	private _pushConfigured = false;
	private _pushPublicKey: string | null = null;
	private _pushState: 'idle' | 'enabling' | 'enabled' | 'error' = 'idle';
	private _smsConfigured = false;
	private _smsState: 'idle' | 'enabling' | 'enabled' | 'error' = 'idle';
	private readonly request: typeof fetch;
	private readonly storage: Pick<StorageService, 'get' | 'set'> | null;
	private readonly submitRegistration: NonNullable<GuestStoreOptions['register']>;
	private readonly submitSignup: NonNullable<GuestStoreOptions['signUp']>;

	get isIdentified(): boolean {
		return this._deviceToken !== null;
	}

	get identity(): GuestIdentity | null {
		return this._identity;
	}

	get notificationSettingsLoaded(): boolean {
		return this._notificationSettingsLoaded;
	}

	get notificationsAvailable(): boolean {
		return this._pushConfigured || this._smsConfigured;
	}

	get notificationsEnabled(): boolean {
		return this._pushState === 'enabled' || this._smsState === 'enabled';
	}

	get pushConfigured(): boolean {
		return this._pushConfigured;
	}

	get pushState(): 'idle' | 'enabling' | 'enabled' | 'error' {
		return this._pushState;
	}

	get notificationsDenied(): boolean {
		return this.browserSupportsPush && Notification.permission === 'denied';
	}

	get canEnablePush(): boolean {
		return (
			this._pushConfigured &&
			this.browserSupportsPush &&
			!this.notificationsDenied &&
			(!this.isIos || this.isStandalone)
		);
	}

	get shouldInstallIosApp(): boolean {
		return this.isIos && !this.isStandalone;
	}

	get smsConfigured(): boolean {
		return this._smsConfigured;
	}

	get smsState(): 'idle' | 'enabling' | 'enabled' | 'error' {
		return this._smsState;
	}

	get canEnableSms(): boolean {
		return this._smsConfigured && this._notificationVisitToken !== null;
	}

	constructor(options: GuestStoreOptions = {}) {
		this.storage = options.storage === undefined ? new StorageService() : options.storage;
		this.request = options.request ?? ((input, init) => fetch(input, init));
		this._deviceToken = this.storage?.get(StorageKey.GUEST_DEVICE_TOKEN) ?? null;
		this._identity = this.readIdentity();
		this.submitRegistration = options.register ?? submitGuestRegistration;
		this.submitSignup = options.signUp ?? submitGuestSignup;

		return makeReactive(this);
	}

	async initialize(): Promise<void> {
		/* If there isn't a device token associated, then the user has not registered yet. */
		if (!this._deviceToken) {
			return;
		}
	}

	async register(input: GuestRegistrationInput): Promise<GuestRegistrationResult> {
		const result = await this.submitRegistration({
			...input,
			deviceToken: this._deviceToken,
		});

		this.saveIdentity(result, input);

		return result;
	}

	/** Signs a guest up: identity only, no session or household data. */
	async signUp(input: GuestSignupInput): Promise<void> {
		const result = await this.submitSignup({
			...input,
			deviceToken: this._deviceToken,
		});

		this.saveIdentity(result, input);
	}

	/** Saves the credential a registration/sign-up response issued, and the identity it carried. */
	private saveIdentity(
		result: { deviceToken?: string },
		input: { firstName: string; lastName: string; phone: string },
	): void {
		if (result.deviceToken) {
			this.storage?.set(StorageKey.GUEST_DEVICE_TOKEN, result.deviceToken);
			this._deviceToken = result.deviceToken;
		}

		if (this.isIdentified) {
			this._identity = {
				firstName: input.firstName,
				lastName: input.lastName,
				phone: input.phone,
			};
			this.storage?.set(StorageKey.GUEST_IDENTITY, this._identity);
		}
	}

	async loadNotificationSettings(visitToken: string): Promise<void> {
		if (this._notificationSettingsLoaded && this._notificationVisitToken === visitToken) {
			return;
		}

		this._notificationVisitToken = visitToken;
		this._notificationSettingsLoaded = false;
		this._pushConfigured = false;
		this._pushPublicKey = null;
		this._pushState = 'idle';
		this._smsConfigured = false;
		this._smsState = 'idle';

		await Promise.all([this.loadPushConfiguration(visitToken), this.loadSmsConfiguration()]);
		await this.loadNotificationStatus(visitToken);

		if (this._notificationVisitToken === visitToken) {
			this._notificationSettingsLoaded = true;
		}
	}

	async enablePushNotifications(): Promise<void> {
		const visitToken = this._notificationVisitToken;

		if (!visitToken || !this._pushPublicKey || !this.canEnablePush) {
			return;
		}

		this._pushState = 'enabling';

		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js');
			const permission = await Notification.requestPermission();

			if (permission !== 'granted') {
				throw new Error('permission');
			}
			const subscription =
				(await registration.pushManager.getSubscription()) ??
				(await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: this.applicationServerKey(this._pushPublicKey),
				}));

			await this.savePushSubscription(subscription, visitToken);
		} catch {
			this._pushState = 'error';
		}
	}

	async enableSmsNotifications(consent: boolean): Promise<void> {
		const visitToken = this._notificationVisitToken;

		if (!visitToken || !this.canEnableSms || !consent) {
			return;
		}

		this._smsState = 'enabling';

		try {
			await this.saveSmsSubscription(visitToken);
		} catch {
			this._smsState = 'error';
		}
	}

	private get browserSupportsPush(): boolean {
		return (
			typeof navigator !== 'undefined' &&
			'serviceWorker' in navigator &&
			typeof window !== 'undefined' &&
			'PushManager' in window &&
			'Notification' in window
		);
	}

	private get isIos(): boolean {
		return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
	}

	private get isStandalone(): boolean {
		return window.matchMedia?.('(display-mode: standalone)').matches === true;
	}

	private applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
		const padding = '='.repeat((4 - (value.length % 4)) % 4);
		const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
		const bytes = window.atob(base64);

		return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
	}

	private async savePushSubscription(
		subscription: PushSubscription,
		visitToken: string,
	): Promise<void> {
		const response = await this.request('/api/push-subscription', {
			method: 'POST',
			headers: { Authorization: `Bearer ${visitToken}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(subscription.toJSON()),
		});

		if (!response.ok) {
			throw new Error('subscription');
		}
		this._pushState = 'enabled';
	}

	private async syncExistingPushSubscription(visitToken: string): Promise<void> {
		if (!this.browserSupportsPush || Notification.permission !== 'granted') {
			return;
		}
		const registration = await navigator.serviceWorker.getRegistration('/');
		const subscription = await registration?.pushManager.getSubscription();

		if (subscription) {
			await this.savePushSubscription(subscription, visitToken);
		}
	}

	private async loadPushConfiguration(visitToken: string): Promise<void> {
		try {
			const response = await this.request('/api/push-subscription');

			if (!response.ok) {
				return;
			}
			const configuration = (await response.json()) as {
				configured: boolean;
				publicKey: string | null;
			};

			this._pushConfigured = configuration.configured;
			this._pushPublicKey = configuration.publicKey;
			await this.syncExistingPushSubscription(visitToken);
		} catch {
			// Notification opt-in remains unavailable if its configuration cannot be loaded.
		}
	}

	private async saveSmsSubscription(visitToken: string): Promise<void> {
		const response = await this.request('/api/sms-subscription', {
			method: 'POST',
			headers: { Authorization: `Bearer ${visitToken}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ consent: true }),
		});

		if (!response.ok) {
			throw new Error('subscription');
		}

		this._smsState = 'enabled';
	}

	private async loadSmsConfiguration(): Promise<void> {
		try {
			const response = await this.request('/api/sms-subscription');

			if (!response.ok) {
				return;
			}
			const configuration = (await response.json()) as { configured: boolean };

			this._smsConfigured = configuration.configured;
		} catch {
			// Notification opt-in remains unavailable if its configuration cannot be loaded.
		}
	}

	private async loadNotificationStatus(visitToken: string): Promise<void> {
		if (!this._deviceToken) {
			return;
		}

		try {
			const response = await this.request('/api/notification-status', {
				headers: { Authorization: `Bearer ${this._deviceToken}` },
			});

			if (!response.ok) {
				return;
			}

			const status = (await response.json()) as {
				pushSubscribed: boolean;
				smsConsented: boolean;
			};

			// Push must still exist in this browser, so its local service-worker subscription remains
			// authoritative. SMS consent is guest-level state and remains true even if attaching it to
			// this visit is temporarily unavailable.
			if (status.smsConsented) {
				this._smsState = 'enabled';

				if (this._smsConfigured) {
					await this.saveSmsSubscription(visitToken);
				}
			}
		} catch {
			// A status lookup failure leaves the guest able to opt in again.
		}
	}

	private readIdentity(): GuestIdentity | null {
		const identity = this.storage?.get(StorageKey.GUEST_IDENTITY);

		if (!identity || !this._deviceToken) {
			return null;
		}

		// Ignore incomplete or corrupted browser storage; it is never repaired from server data.
		if (
			typeof identity === 'object' &&
			identity !== null &&
			'firstName' in identity &&
			typeof identity.firstName === 'string' &&
			'lastName' in identity &&
			typeof identity.lastName === 'string' &&
			'phone' in identity &&
			typeof identity.phone === 'string'
		) {
			return {
				firstName: identity.firstName,
				lastName: identity.lastName,
				phone: identity.phone,
			};
		}

		return null;
	}
}
