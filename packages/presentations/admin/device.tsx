import { runInAction } from 'mobx';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import { adminTranslations } from '../../../src/adminLocales.ts';
import type { AdminView } from '../../../src/services/admin-views.ts';
import { RootStore } from '../../../src/stores/root.store.ts';
import { PhoneClock } from '../phone/clock.ts';
import { MarkLayer, scrollUnderBar } from '../phone/marks.ts';
import { AdminApp } from './AdminApp.tsx';
import { currentView, markTarget, navigation, revealInDialog, switcher } from './marks.ts';
import type { AdminHandle, AdminMark, AdminScene } from './scene.ts';
import { AdminServer } from './server.ts';

const t = adminTranslations.en;
/** How many times a scene is applied again before the frame gives up on matching it. */
const ATTEMPTS = 5;

/** A fresh, empty browser storage for each dashboard, so nothing carries from one to the next. */
function memoryStorage(): Storage {
	const saved = new Map<string, string>();

	return {
		get length() {
			return saved.size;
		},
		key: (index) => [...saved.keys()][index] ?? null,
		getItem: (key) => saved.get(key) ?? null,
		setItem: (key, value) => void saved.set(key, String(value)),
		removeItem: (key) => void saved.delete(key),
		clear: () => saved.clear(),
	};
}

/** What the server reports. A change here is reloaded the way the dashboard reloads it. */
const records = (scene: AdminScene) => JSON.stringify([scene.market, scene.guests, scene.archived]);

/** Lets React render, and its effects run, after a change outside it. */
function nextTask(): Promise<void> {
	return new Promise((resolve) => {
		const channel = new MessageChannel();

		channel.port1.onmessage = () => resolve();
		channel.port2.postMessage(null);
	});
}

/** Types into a field React controls, as a keyboard would: its value, then the input event. */
function typeInto(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
	if (field.value === value) {
		return;
	}

	Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set?.call(field, value);
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * The admin dashboard: the app's own stores and screens, on a clock, a network and a browser
 * storage of the guide's making. Every scene is applied through the dashboard's public seams — the
 * stores' reloads, and real taps and typing on the screen — so what it shows is what the dashboard
 * would show.
 *
 * Commands never reach the server. Where the narration accepts a confirmation, the sheet is
 * withdrawn and the next scene's records carry the result, which the dashboard then reloads as it
 * would after a command. So a moment's screen is the same whether the timeline played into it or
 * jumped to it, and a seek can build it straight from the scene.
 */
export class AdminDevice implements AdminHandle {
	readonly ready: Promise<void>;
	private readonly clock = new PhoneClock();
	private readonly marks: MarkLayer;
	private server: AdminServer | null = null;
	private store: RootStore | null = null;
	private root: Root | null = null;
	private shown: AdminScene | null = null;
	private pending: { scene: AdminScene; rebuild: boolean } | null = null;
	private running: Promise<void> | null = null;
	private failure: Error | null = null;
	private readonly notFound = new Set<string>();

	constructor(private readonly container: HTMLElement) {
		const screen = document.createElement('div');

		screen.className = 'phone-marks';
		document.body.appendChild(screen);
		this.marks = new MarkLayer(
			() => this.container.querySelector<HTMLElement>('.phone-scroll'),
			screen,
		);
		window.fetch = (input, init) => this.network.fetch(input, init);
		this.ready = document.fonts.ready.then(() => undefined);
	}

	private get network(): AdminServer {
		if (!this.server) {
			throw new Error('The admin frame has no scene yet.');
		}

		return this.server;
	}

	private get current(): RootStore {
		if (!this.store) {
			throw new Error('The admin frame has not started.');
		}

		return this.store;
	}

	show(scene: AdminScene, continuous: boolean): void {
		this.pending = { scene, rebuild: !continuous || (this.pending?.rebuild ?? false) };
		this.running ??= this.run().finally(() => {
			this.running = null;
		});
	}

	unanswered(): string[] {
		return [...(this.server?.unexpected ?? [])];
	}

	missing(): string[] {
		return [...this.notFound];
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
				await (rebuild || !this.shown ? this.build(scene) : this.update(scene));
				await this.converge(scene);
				this.shown = scene;
				this.failure = null;
			} catch (error) {
				this.failure = error instanceof Error ? error : new Error(String(error));
				console.error(this.failure);
			}
		}
	}

	/** A new dashboard, opened on the scene's screen with the scene's records loaded. */
	private async build(scene: AdminScene): Promise<void> {
		this.clock.reset(scene.now);
		this.server = new AdminServer(scene);

		const store = new RootStore({ browserStorage: memoryStorage() });

		// What the dashboard would otherwise load once it is up, loaded before it draws.
		store.session.applyServerState(this.server.overview);

		// The old screen gives way to the new one in a single step, so the frame never shows blank.
		this.root?.unmount();
		this.store?.[Symbol.dispose]();
		this.store = store;
		this.root = createRoot(this.container);
		flushSync(() => this.root?.render(<AdminApp store={store} view={scene.view} />));
		await this.commit();
		await this.screen(scene);
	}

	/** Carries the dashboard on to the next moment of the scene it is already showing. */
	private async update(scene: AdminScene): Promise<void> {
		const server = this.network;
		const changed = records(server.scene) !== records(scene);

		server.scene = scene;
		this.clock.advanceTo(scene.now);

		if (changed) {
			await this.reload();
		}
		await this.screen(scene);
	}

	/** Reloads what a command would have changed, as `AdminStore` does after one. */
	private async reload(): Promise<void> {
		const { session, admin } = this.current;

		await session.getStatus();
		await Promise.all([
			admin.refreshSessionGuests(),
			admin.refreshGuests(),
			admin.refreshHistory(),
		]);
	}

	/** The screen, the sheet of screens, the confirmation sheet, the add-guest dialog and the broadcast form. */
	private async screen(scene: AdminScene): Promise<void> {
		await this.navigate(scene.view);
		await this.navigation(scene);
		await this.confirmation(scene);
		await this.addGuest(scene);
		this.broadcast(scene);
		await this.commit();
	}

	/** The screen the dashboard is on, as its title names it. */
	private get view(): AdminView | null {
		return currentView(document);
	}

	/**
	 * Moves to `view` as a worker would: on a phone, the title opens the sheet of screens and the
	 * screen is tapped there, which closes it again.
	 */
	private async navigate(view: AdminView): Promise<void> {
		if (this.view === view) {
			return;
		}

		if (!navigation(document)) {
			this.press('switcher');
			await this.commit();
		}

		this.press(`tab:${view}`);
		await this.commit();
	}

	/** The view switcher's sheet, opened from the title and closed by tapping outside it. */
	private async navigation(scene: AdminScene): Promise<void> {
		const open = Boolean(navigation(document));

		if (scene.navigating && !open && switcher(document)) {
			this.press('switcher');
			await this.commit();
		} else if (!scene.navigating && open && switcher(document)) {
			document.querySelector<HTMLElement>('.MuiDrawer-root .MuiBackdrop-root')?.click();
			await this.commit();
		}
	}

	/**
	 * The confirmation sheet, opened by tapping the button that asks for it. Withdrawn rather than
	 * accepted when the scene closes it: the next scene's records carry what accepting would do.
	 */
	private async confirmation(scene: AdminScene): Promise<void> {
		const { confirmation } = this.current;

		if (!scene.confirm && confirmation.pending) {
			confirmation.dismiss();
			await this.commit();
		} else if (scene.confirm && !confirmation.pending) {
			this.press(scene.confirm);
			await this.commit();
		}
	}

	/** The add-guest dialog: opened from its button, filled through the guest's own form fields. */
	private async addGuest(scene: AdminScene): Promise<void> {
		const open = () => markTarget('dialog', document);

		if (scene.addGuest && !open()) {
			this.press('button:addGuest');
			await this.commit();
		} else if (!scene.addGuest && open()) {
			const cancel = open()?.querySelectorAll<HTMLElement>('button');

			[...(cancel ?? [])].find((button) => button.textContent?.trim() === t.cancel)?.click();
			await this.commit();
		}

		if (scene.addGuest) {
			const form = scene.addGuest;
			const { registration } = this.current;

			runInAction(() => {
				const { guest } = registration;
				const changed = Object.entries(form).some(
					([key, value]) => guest[key as keyof typeof form] !== value,
				);

				if (changed) {
					registration.updateGuest(form);
				}
			});
		}
	}

	/** The broadcast form's fields, which belong to the dashboard's own component state. */
	private broadcast(scene: AdminScene): void {
		if (scene.view !== 'broadcast') {
			return;
		}

		const input = (key: 'broadcastTitleLabel' | 'broadcastMessageLabel') =>
			markTarget(`field:${key}`, document)?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
				'input, textarea',
			);
		const title = input('broadcastTitleLabel');
		const body = input('broadcastMessageLabel');

		if (title) {
			typeInto(title, scene.broadcast.title);
		}

		if (body) {
			typeInto(body, scene.broadcast.body);
		}
	}

	/** Taps what a mark names, or fails by its name when the screen doesn't show it. */
	private press(mark: AdminMark): void {
		const target = markTarget(mark, document);

		if (!target) {
			throw new Error(`The admin frame has nothing to tap for "${mark}".`);
		}

		target.click();
	}

	/** Lets every answer arrive and every render land, then the timers due now fire. */
	private async commit(): Promise<void> {
		for (let round = 0; round < 3; round++) {
			await this.server?.whenIdle();
			await nextTask();
			this.clock.flush();
		}
	}

	/** Whether the dashboard shows the scene's screen, records, sheet and dialog. */
	private matches(scene: AdminScene): boolean {
		const { session, confirmation } = this.current;

		return (
			this.view === scene.view &&
			// A desk's sidebar is always there; only a phone's sheet opens and shuts.
			(!switcher(document) || Boolean(navigation(document)) === scene.navigating) &&
			session.currentState?.event?.id === this.network.overview.event?.id &&
			session.currentState?.event?.status === this.network.overview.event?.status &&
			Boolean(confirmation.pending) === Boolean(scene.confirm) &&
			Boolean(markTarget('dialog', document)) === Boolean(scene.addGuest)
		);
	}

	/**
	 * Checks the dashboard shows the scene, applying it again where an answer arrived out of order.
	 * Then scrolls to what the narration is about and draws what it points at, noting any mark the
	 * screen doesn't show — the sign that the dashboard has changed under the guide.
	 */
	private async converge(scene: AdminScene): Promise<void> {
		for (let attempt = 0; ; attempt++) {
			await this.commit();

			if (this.matches(scene)) {
				break;
			}

			if (attempt === ATTEMPTS) {
				throw new Error(
					`The admin frame could not show the scene at ${new Date(scene.now).toISOString()}.`,
				);
			}
			await this.reload();
			await this.screen(scene);
		}

		const find = (mark: AdminMark | null) => {
			const target = mark ? markTarget(mark, document) : null;

			if (mark && !target) {
				this.notFound.add(mark);
			}

			revealInDialog(target);

			return target;
		};

		scrollUnderBar(this.container, find(scene.scrollTo));
		this.marks.draw(find(scene.focus), find(scene.tap), scene.tap);
	}
}
