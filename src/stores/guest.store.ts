import { runInAction } from 'mobx';

import {
	submitGuestRegistration,
	submitGuestSignup,
	type GuestRegistrationInput,
	type GuestRegistrationResult,
	type GuestSignupInput,
	type GuestSignupResult,
} from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, StorageService } from '../services/storage.service.ts';

export type GuestIdentity = Pick<GuestRegistrationInput, 'firstName' | 'lastName' | 'phone'>;

export type GuestStoreOptions = {
	request?: typeof fetch;
	storage?: Pick<StorageService, 'get' | 'set' | 'remove'> | null;
	register?: (
		payload: GuestRegistrationInput & { deviceToken: string | null },
	) => Promise<GuestRegistrationResult>;
	signUp?: (
		payload: GuestSignupInput & { deviceToken: string | null },
	) => Promise<GuestSignupResult>;
};

/**
 * The `GuestStore` class manages guest user data and interactions, such as registration, notifications, and device token storage.
 * It provides methods for initializing, registering, signing up, managing notifications, and persisting data across user sessions.
 *
 * @remarks
 * Guests are identified by a browser-local device token to keep registration friction low.
 * An *identified* guest is a user whose device has been assigned a *device token*. This can lead to the situation where
 * the same person in the real world may be represented by multiple `guest` records in the database, but that is a compromise
 * that we have accepted.
 *
 * Moreover, to prevent unauthorized leakage of user data, user information is never retrieved from the server.
 * Instead, the guest's identity is stored locally in storage.
 */
export class GuestStore {
	private _deviceToken: string | null;
	private _identity: GuestIdentity | null;

	private _isReturningVisitor: boolean;
	private _notificationSettingsLoaded = false;
	private _notificationSettingsPromise: Promise<void> | null = null;

	private _pushConfigured = false;
	private _pushPublicKey: string | null = null;
	private _pushState: 'idle' | 'enabling' | 'enabled' | 'error' = 'idle';

	private _smsConfigured = false;
	private _smsState: 'idle' | 'enabling' | 'enabled' | 'error' = 'idle';

	private readonly request: typeof fetch;
	private readonly storage: Pick<StorageService, 'get' | 'set' | 'remove'> | null;
	private readonly submitRegistration: NonNullable<GuestStoreOptions['register']>;
	private readonly submitSignup: NonNullable<GuestStoreOptions['signUp']>;

	/**
	 * Returns whether the user has been *identified*.
	 */
	get isIdentified(): boolean {
		return this._deviceToken !== null;
	}

	/**
	 * Returns the guest's identity.
	 *
	 * @remarks
	 * Note: after creation, the identity is not retrieved again from the server.
	 * Instead, the guest's identity is stored locally in storage.
	 */
	get identity(): GuestIdentity | null {
		return this._identity;
	}

	get displayedName() {
		if (!this.isIdentified || !this.identity) {
			return null;
		}

		const { firstName, lastName } = this.identity;
		const lastInitial = lastName?.charAt(0);

		return `${firstName} ${lastInitial}`;
	}

	/**
	 * A returning visitor is a guest who launched the app before and has chosen a language.
	 *
	 * @remarks
	 * This is not equivalent to an *identified* guest.
	 */
	get isReturningVisitor(): boolean {
		return this._isReturningVisitor;
	}

	get notificationSettingsLoaded(): boolean {
		return this._notificationSettingsLoaded;
	}

	get smsConsented(): boolean {
		return this._smsState === 'enabled';
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
		return this._smsConfigured && this._deviceToken !== null;
	}

	forceDisableSms: boolean = false;

	constructor(options: GuestStoreOptions = {}) {
		this.storage = options.storage === undefined ? new StorageService() : options.storage;
		this.request = options.request ?? ((input, init) => fetch(input, init));
		this._deviceToken = this.storage?.get(StorageKey.GUEST_DEVICE_TOKEN) ?? null;
		this._identity = this.readIdentity();
		this._isReturningVisitor = this.storage?.get(StorageKey.RETURNING_VISITOR) ?? false;
		this.submitRegistration = options.register ?? submitGuestRegistration;
		this.submitSignup = options.signUp ?? submitGuestSignup;

		return makeReactive(this, {
			_notificationSettingsPromise: false,
			request: false,
			storage: false,
			submitRegistration: false,
			submitSignup: false,
		});
	}

	async initialize(): Promise<void> {
		/* If there isn't a device token associated, then the user has not registered yet. */
		if (!this._deviceToken) {
			return;
		}

		try {
			await this.loadNotificationSettings();
		} catch {
			// The identity indicator owns the user-facing error state for this optional request.
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

	/** Called once a guest has picked a language, so future visits skip the language hero in
	 *  favor of the compact picker in `AppBar`. */
	markAsReturningVisitor(): void {
		this._isReturningVisitor = true;
		this.storage?.set(StorageKey.RETURNING_VISITOR, true);
	}

	async forget(): Promise<void> {
		this.storage?.remove(StorageKey.GUEST_DEVICE_TOKEN);
		this.storage?.remove(StorageKey.GUEST_IDENTITY);
		this._deviceToken = null;
		this._identity = null;
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

	loadNotificationSettings(): Promise<void> {
		if (this._notificationSettingsPromise) {
			return this._notificationSettingsPromise;
		}

		if (this._notificationSettingsLoaded || this.forceDisableSms) {
			return Promise.resolve();
		}

		this._notificationSettingsPromise = this.retrieveNotificationSettings();

		return this._notificationSettingsPromise;
	}

	private async retrieveNotificationSettings(): Promise<void> {
		this._notificationSettingsLoaded = false;
		this._pushConfigured = false;
		this._pushPublicKey = null;
		this._pushState = 'idle';
		this._smsConfigured = false;
		this._smsState = 'idle';

		await Promise.all([this.loadPushConfiguration(), this.loadSmsConfiguration()]);
		await this.loadNotificationStatus();
		runInAction(() => (this._notificationSettingsLoaded = true));
	}

	async enablePushNotifications(visitToken: string): Promise<void> {
		if (!this._pushPublicKey) {
			await this.loadPushConfiguration(visitToken);
		}

		if (!this._pushPublicKey || !this.canEnablePush) {
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
			runInAction(() => (this._pushState = 'error'));
		}
	}

	async enableSmsNotifications(consent: boolean): Promise<void> {
		if (!this._deviceToken || !this.canEnableSms || !consent) {
			return;
		}

		this._smsState = 'enabling';

		try {
			await this.saveSmsSubscription();
		} catch {
			runInAction(() => (this._smsState = 'error'));
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
		runInAction(() => (this._pushState = 'enabled'));
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

	private async loadPushConfiguration(visitToken?: string): Promise<void> {
		try {
			const response = await this.request('/api/push-subscription');

			if (!response.ok) {
				return;
			}
			const configuration = (await response.json()) as {
				configured: boolean;
				publicKey: string | null;
			};

			runInAction(() => {
				this._pushConfigured = configuration.configured;
				this._pushPublicKey = configuration.publicKey;
			});

			if (visitToken) {
				await this.syncExistingPushSubscription(visitToken);
			}
		} catch {
			// Notification opt-in remains unavailable if its configuration cannot be loaded.
		}
	}

	private async saveSmsSubscription(): Promise<void> {
		if (!this._deviceToken) {
			throw new Error('identity');
		}

		const response = await this.request('/api/sms-subscription', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this._deviceToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ consent: true }),
		});

		if (!response.ok) {
			throw new Error('subscription');
		}

		runInAction(() => (this._smsState = 'enabled'));
	}

	private async loadSmsConfiguration(): Promise<void> {
		try {
			const response = await this.request('/api/sms-subscription');

			if (!response.ok) {
				return;
			}
			const configuration = (await response.json()) as { configured: boolean };

			runInAction(() => (this._smsConfigured = configuration.configured));
		} catch {
			// Notification opt-in remains unavailable if its configuration cannot be loaded.
		}
	}

	private async loadNotificationStatus(): Promise<void> {
		if (!this._deviceToken) {
			return;
		}

		const response = await this.request('/api/notification-status', {
			headers: { Authorization: `Bearer ${this._deviceToken}` },
		});

		if (!response.ok) {
			throw new Error('notification-status');
		}

		const status = (await response.json()) as {
			pushSubscribed: boolean;
			smsConsented: boolean;
		};

		// Push must still exist in this browser, so its local service-worker subscription remains
		// authoritative. SMS consent is durable guest-level state.
		runInAction(() => (this._smsState = status.smsConsented ? 'enabled' : 'idle'));
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
