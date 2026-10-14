import { runInAction } from 'mobx';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import { translations } from '../../../src/locales.ts';
import type { CurrentVisit } from '../../../src/services/guestVisitApi.ts';
import { StorageKey, StorageService } from '../../../src/services/storage.service.ts';
import { RootStore } from '../../../src/stores/root.store.ts';
import { PhoneClock } from './clock.ts';
import { MarkLayer, markTarget } from './marks.ts';
import { PhoneApp } from './PhoneApp.tsx';
import type { PhoneHandle, PhoneScene } from './scene.ts';
import { MARKET_ID, PhoneServer, VISIT_ID } from './server.ts';

const VISIT_TOKEN_KEY = 'bay-compassion.visit-token';
const VISIT_TOKEN = 'guide-visit-token';
const DEVICE_TOKEN = 'guide-device-token';
const visitFields = [
	'id',
	'marketEventId',
	'status',
	'queuePosition',
	'priorityNumber',
	'aheadOfYou',
	'calledAt',
	'nowCalling',
	'called',
	'calledPriority',
] as const satisfies (keyof CurrentVisit)[];
/** How many times a scene is applied again before the phone gives up on matching it. */
const ATTEMPTS = 5;

/** The browser storage of a phone that has lived through the scene so far. */
function storageFor(scene: PhoneScene): Storage {
	const saved = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return saved.size;
		},
		key: (index) => [...saved.keys()][index] ?? null,
		getItem: (key) => saved.get(key) ?? null,
		setItem: (key, value) => void saved.set(key, String(value)),
		removeItem: (key) => void saved.delete(key),
		clear: () => saved.clear(),
	};
	const service = new StorageService(storage);

	storage.setItem(StorageKey.LOCALE, scene.locale);
	service.set(StorageKey.RETURNING_VISITOR, scene.returning);
	// The guide shows the app; the app's own tour would cover it.
	service.set(StorageKey.GUEST_TOUR_SEEN, true);

	if (scene.identity) {
		service.set(StorageKey.GUEST_DEVICE_TOKEN, DEVICE_TOKEN);
		service.set(StorageKey.GUEST_IDENTITY, { ...scene.identity, pronunciation: '' });
	}

	if (scene.visit) {
		storage.setItem(VISIT_TOKEN_KEY, VISIT_TOKEN);
	}

	return storage;
}

/**
 * What can't change while the phone carries on as it is. A scene that differs here — another
 * language, another guest, another page — starts the phone over, as a seek does.
 */
const structure = (scene: PhoneScene) =>
	JSON.stringify([scene.locale, scene.route, scene.returning, scene.identity]);

/** A promise React's `use` reads as already fulfilled, so a screen that awaits it never suspends. */
function fulfilled(promise: Promise<void> & { status?: string; value?: undefined }): void {
	promise.status = 'fulfilled';
	promise.value = undefined;
}

/** Lets React render, and its effects run, after a change outside it. */
function nextTask(): Promise<void> {
	return new Promise((resolve) => {
		const channel = new MessageChannel();

		channel.port1.onmessage = () => resolve();
		channel.port2.postMessage(null);
	});
}

/**
 * The guest phone: the app's own stores and screens, on a clock, a network and a browser storage
 * of the guide's making. Every scene is applied through the app's public seams — the market's
 * state, the visit's lookup, the registration form's fields, and real taps on the screen — so what
 * it shows is what the app would show.
 *
 * A scene shown while the timeline plays on is applied to the phone as it is. Anything else — a
 * seek, a new language, another guest — builds a new phone from the scene, so the same moment
 * always looks the same however the viewer reached it.
 */
export class PhoneDevice implements PhoneHandle {
	readonly ready: Promise<void>;
	private readonly clock = new PhoneClock();
	private readonly marks: MarkLayer;
	private server: PhoneServer | null = null;
	private store: RootStore | null = null;
	private root: Root | null = null;
	private requested: PhoneScene | null = null;
	private pending: { scene: PhoneScene; rebuild: boolean } | null = null;
	private running: Promise<void> | null = null;
	private failure: Error | null = null;

	constructor(private readonly container: HTMLElement) {
		const screen = document.createElement('div');

		screen.className = 'phone-marks';
		document.body.appendChild(screen);
		this.marks = new MarkLayer(() => this.scroller, screen);
		window.fetch = (input, init) => this.network.fetch(input, init);
		this.ready = document.fonts.ready.then(() => undefined);
	}

	private get network(): PhoneServer {
		if (!this.server) {
			throw new Error('The phone has no scene yet.');
		}

		return this.server;
	}

	show(scene: PhoneScene, continuous: boolean): void {
		const rebuild =
			!continuous ||
			!this.requested ||
			structure(scene) !== structure(this.requested) ||
			(this.pending?.rebuild ?? false);

		this.requested = scene;
		this.pending = { scene, rebuild };
		this.running ??= this.run().finally(() => {
			this.running = null;
		});
	}

	unanswered(): string[] {
		return [...(this.server?.unexpected ?? [])];
	}

	async settle(): Promise<void> {
		while (this.running) {
			await this.running;
		}

		if (this.failure) {
			throw this.failure;
		}
	}

	private async run(): Promise<void> {
		while (this.pending) {
			const { scene, rebuild } = this.pending;

			this.pending = null;

			try {
				await (rebuild ? this.build(scene) : this.update(scene));
				await this.converge(scene);
				this.failure = null;
			} catch (error) {
				this.failure = error instanceof Error ? error : new Error(String(error));
				console.error(this.failure);
			}
		}
	}

	/** A new phone, as it would be having lived through the scene: storage, clock, stores, screen. */
	private async build(scene: PhoneScene): Promise<void> {
		this.clock.reset(scene.now);
		this.server = new PhoneServer(scene);

		const storage = storageFor(scene);
		const store = new RootStore({ browserStorage: storage });

		// Everything the screen would otherwise load once it is up, loaded before it draws.
		store.session.applyServerState(this.server.overview);

		if (scene.identity) {
			const settings = store.guest.loadNotificationSettings();

			await settings;
			fulfilled(settings);
		}

		if (scene.visit) {
			await store.visit.refresh();
		}

		runInAction(() => {
			store.registration.updateGuest(scene.form);
			store.registration.isSubmitting = scene.submitting;
		});

		// The old screen gives way to the new one in a single step, so the phone never shows blank.
		this.root?.unmount();
		this.store?.[Symbol.dispose]();
		this.store = store;
		this.root = createRoot(this.container);
		flushSync(() => this.root?.render(<PhoneApp store={store} route={scene.route} />));
		await this.texts(scene);
	}

	/** Carries the phone on to the next moment of the scene it is already showing. */
	private async update(scene: PhoneScene): Promise<void> {
		const store = this.current;
		const server = this.network;
		const marketChanged = JSON.stringify(server.scene.market) !== JSON.stringify(scene.market);

		server.scene = scene;
		this.clock.advanceTo(scene.now);

		runInAction(() => {
			if (marketChanged) {
				store.session.applyServerState(server.overview);
			}

			const { guest } = store.registration;
			const changed = Object.entries(scene.form).some(
				([key, value]) => guest[key as keyof typeof scene.form] !== value,
			);

			if (changed) {
				store.registration.updateGuest(scene.form);
			}
			store.registration.isSubmitting = scene.submitting;
		});
		await this.visit(scene);
		await this.texts(scene);
	}

	private get current(): RootStore {
		if (!this.store) {
			throw new Error('The phone has not started.');
		}

		return this.store;
	}

	/** Starts, ends, or refreshes the guest's visit, as the app does when its lookup answers. */
	private async visit(scene: PhoneScene): Promise<void> {
		const { visit } = this.current;

		if (scene.visit && !visit.currentVisit) {
			// What a registration's answer does (see `GuestCombinedForm`).
			visit.submit(
				{ id: VISIT_ID, visitToken: VISIT_TOKEN, status: scene.visit.status },
				MARKET_ID,
			);
		} else if (!scene.visit && visit.currentVisit) {
			visit.reset();

			return;
		}

		if (scene.visit && !this.visitMatches()) {
			await visit.refresh();
		}
	}

	/** Whether the phone's visit is the one the server reports, in every field the screen reads. */
	private visitMatches(): boolean {
		const shown = this.current.visit.currentVisit;
		const wanted = this.network.visit;

		return (
			shown === wanted ||
			(shown !== null &&
				wanted !== null &&
				visitFields.every((key) => JSON.stringify(shown[key]) === JSON.stringify(wanted[key])))
		);
	}

	/**
	 * Text updates, through the screen as a guest would sign up: open the sheet, tick the box, tap
	 * Enable. The sheet is the identity card's own state, so tapping is the only way in.
	 */
	private async texts(scene: PhoneScene): Promise<void> {
		const store = this.current;

		if (!scene.identity) {
			return;
		}

		await this.commit();
		const copy = translations[scene.locale].guestView;
		const sheet = () =>
			document.querySelector<HTMLElement>('[role="dialog"] .notification-consent');
		const box = () => sheet()?.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null;
		const wantsSheet = scene.texts.sheet !== 'closed' && !store.guest.smsConsented;

		if (wantsSheet && !sheet()) {
			document.querySelector<HTMLElement>('[data-tour="text-updates"]')?.click();
			await this.commit();
		}

		if (scene.texts.sheet === 'checked' && box()?.checked === false) {
			box()?.click();
			await this.commit();
		}

		if (scene.texts.consented && !store.guest.smsConsented) {
			if (box()?.checked) {
				markTarget('enable', document, translations[scene.locale])?.click();
			} else {
				await store.guest.refreshNotificationSettings();
			}
			await this.commit();
		}

		if (!wantsSheet && !scene.texts.consented && sheet()) {
			for (const button of document.querySelectorAll<HTMLElement>('[role="dialog"] button')) {
				if (button.getAttribute('aria-label') === copy.identityIndicator.closeNotificationsDialog) {
					button.click();
				}
			}
			await this.commit();
		}
	}

	/** Lets every answer arrive and every render land, then the timers due now fire. */
	private async commit(): Promise<void> {
		for (let round = 0; round < 3; round++) {
			await this.server?.whenIdle();
			await nextTask();
			this.clock.flush();
		}
	}

	/**
	 * Checks the phone shows the scene, applying it again where an answer arrived out of order.
	 * Then scrolls to what the narration is about and draws what it points at.
	 */
	private async converge(scene: PhoneScene): Promise<void> {
		for (let attempt = 0; ; attempt++) {
			await this.commit();
			const store = this.current;
			const matches =
				(!scene.visit || this.visitMatches()) &&
				Boolean(scene.visit) === Boolean(store.visit.currentVisit) &&
				(!scene.identity || store.guest.smsConsented === scene.texts.consented);

			if (matches) {
				break;
			}

			if (attempt === ATTEMPTS) {
				throw new Error(
					`The guest phone could not show the scene at ${new Date(scene.now).toISOString()}.`,
				);
			}
			await this.visit(scene);
			await this.texts(scene);
		}

		const t = translations[scene.locale];

		document.documentElement.lang = scene.locale;
		document.documentElement.dir = this.current.translations.dir;
		this.scroll(scene.scrollTo ? markTarget(scene.scrollTo, document, t) : null);
		this.marks.draw(
			scene.focus ? markTarget(scene.focus, document, t) : null,
			scene.tap ? markTarget(scene.tap, document, t) : null,
			scene.tap,
		);
	}

	/** The page's content under the bar, which the phone scrolls. */
	private get scroller(): HTMLElement | null {
		return this.container.querySelector('.phone-scroll');
	}

	/**
	 * Scrolls the page under the bar so `target` shows whole — its top, when it is taller than the
	 * screen — or back to the top. The page moves by a transform, which the stylesheet eases.
	 */
	private scroll(target: HTMLElement | null): void {
		const scroller = this.scroller;

		if (!scroller) {
			return;
		}

		const bar = this.container.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
		const view = window.innerHeight - bar;
		let offset = 0;

		if (target && scroller.contains(target)) {
			const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
			const bottom = top + target.offsetHeight;
			const most = Math.max(0, scroller.offsetHeight - view);

			offset = Math.min(Math.max(0, bottom + 16 - view), Math.max(0, top - 16), most);
		}

		scroller.style.transform = `translateY(${-offset}px)`;
	}
}
