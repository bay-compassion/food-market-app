import type { Page } from 'playwright';

import type { Translation } from '../../src/locales.js';
import { SessionStatusEnum } from '../../src/services/sessionStateMachine.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';

/**
 * Who is holding the phone, as far as the app can tell from what it has saved on it.
 *
 * - `returning` has chosen a language before but has not given a name.
 * - `identified` has given a name and phone, so the app knows who they are.
 */
export type GuestProfile = 'returning' | 'identified';

/** A guest's visit today, as the server would report it. */
export type VisitScene = {
	status: VisitStatus;
	queuePosition?: number;
	aheadOfYou?: number;
};

/**
 * The ways a beat has the server misbehave, or answer with something other than the usual. A call
 * that is not named here is answered as it would be on a good day.
 */
export type ServerScene = {
	/** `pending` never answers, which is what a slow connection looks like; `unreachable` fails. */
	market?: 'pending' | 'unreachable';
	/**
	 * What the guest's text-message settings say: already agreed, texted STOP earlier, still being
	 * looked up, or could not be looked up.
	 */
	notifications?: 'enabled' | 'opted-out' | 'pending' | 'unreachable';
	/** Agreeing to text messages is refused. */
	enableText?: 'fails';
};

/**
 * One screenshot: a whole screen of the running app, and the state that puts it there.
 *
 * A screenshot is described by the state the app is in rather than by a component, because it is the app
 * — bar, footer, and all — not a piece of it. The state is what a guest's phone and the server would
 * say: what is saved on the device, what today's market is doing, and what their visit is. `interact`
 * then takes the guest one step further, for a screen that is not a resting state.
 *
 * What a screenshot shows, and any caveat about it, is written where it is used — in the MDX page that
 * embeds it with `<Screenshot id="…" />` — not here.
 */
export type ScreenshotStep = {
	/** Names the screenshot's PNG and is what a page embeds it by, so it never changes. */
	id: string;
	/** Where the phone is pointed. Defaults to the guest home screen. */
	route?: string;
	/** Defaults to `returning`. */
	guest?: GuestProfile;
	/** What today's market is doing, or `null` when none is scheduled. Defaults to `null`. */
	market?: SessionStatusEnum | null;
	visit?: VisitScene;
	server?: ServerScene;
	/** What a guest does after the screen has settled, before it is captured. */
	interact?: (page: Page, copy: Translation) => Promise<void>;
	/**
	 * A sheet or dialog is open, so the screenshot is the screen a guest sees rather than the whole page
	 * scrolled out flat behind it.
	 */
	overlay?: boolean;
	/**
	 * Text that must be on screen before the screenshot is taken. Written against the copy rather
	 * than as a literal, so a wording change follows itself — and so a beat that never reaches its
	 * screen (a route that moved, a fixture the app stopped understanding) stops the run instead of
	 * printing a spinner in the middle of the document.
	 */
	anchor: (copy: Translation) => string;
};

const { REGISTRATION_OPEN, SERVICE_STARTED } = SessionStatusEnum;

async function fillIdentity(page: Page, copy: Translation) {
	await page.getByLabel(copy.firstName).fill('Sample');
	await page.getByLabel(copy.lastName).fill('Guest');
	await page.getByLabel(copy.phone).fill('5555550142');
}

async function openIdentityMenu(page: Page, copy: Translation) {
	const { identityIndicator } = copy.guestView;

	await page.getByRole('button', { name: identityIndicator.openIdentityMenu }).click();
	await page.getByRole('menuitem', { name: identityIndicator.forgetInformation }).waitFor();
}

async function openTextUpdates(page: Page, copy: Translation) {
	const { identityIndicator } = copy.guestView;

	await page.getByRole('button', { name: identityIndicator.notificationsAction }).click();
	await page.getByRole('dialog', { name: identityIndicator.notificationsDialogTitle }).waitFor();
}

/** A guest who has agreed to text messages sees the menu as it is when every item is live. */
const enabledTexts: ServerScene = { notifications: 'enabled' };

/**
 * The screenshots, for the screens a docs page cannot show as a story: those a guest only reaches by
 * doing something (a dialog, a menu, a confirmation sheet, a form just submitted), where the server
 * answers with a failure or does not answer, and routes rather than components. A state a story can
 * show belongs in a story, embedded in the page that explains it; this list is only for the rest.
 */
export const screenshots: ScreenshotStep[] = [
	{
		id: 'identity-saved',
		route: '/signup',
		interact: async (page, copy) => {
			await fillIdentity(page, copy);
			await page.getByRole('button', { name: copy.signupView.submit }).click();
			await page.getByText(copy.signupView.successTitle).waitFor();
		},
		anchor: (copy) => copy.signupView.formTitle,
	},
	{
		id: 'cancel-asked',
		guest: 'identified',
		market: SERVICE_STARTED,
		visit: { status: 'waiting', queuePosition: 7, aheadOfYou: 6 },
		overlay: true,
		interact: async (page, copy) => {
			await page.getByRole('button', { name: copy.guestView.visitStatus.cancelAction }).click();
			await page
				.getByRole('alertdialog')
				.getByText(copy.guestView.visitStatus.cancelConfirmation)
				.waitFor();
		},
		anchor: (copy) => copy.guestView.visitStatus.waiting.header,
	},
	{
		id: 'market-loading',
		server: { market: 'pending' },
		anchor: (copy) => copy.statusLoading,
	},
	{
		id: 'market-unavailable',
		server: { market: 'unreachable' },
		anchor: (copy) => copy.guestView.notOpenState.heading,
	},
	{
		id: 'text-updates',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		overlay: true,
		interact: openTextUpdates,
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'text-updates-agreed',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		overlay: true,
		interact: async (page, copy) => {
			await openTextUpdates(page, copy);
			await page.getByRole('dialog').getByRole('checkbox').check();
		},
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'text-updates-failed',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: { enableText: 'fails' },
		overlay: true,
		interact: async (page, copy) => {
			const { notificationOptIn } = copy.guestView;

			await openTextUpdates(page, copy);
			await page.getByRole('dialog').getByRole('checkbox').check();
			await page.getByRole('button', { name: notificationOptIn.enable }).click();
			await page.getByRole('dialog').getByText(notificationOptIn.error).waitFor();
		},
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'text-updates-enabled',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: enabledTexts,
		anchor: (copy) => copy.guestView.identityIndicator.notificationsEnabled,
	},
	{
		id: 'text-updates-opted-out',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: { notifications: 'opted-out' },
		overlay: true,
		interact: async (page, copy) => {
			await openTextUpdates(page, copy);
			await page.getByRole('dialog').getByText(copy.guestView.notificationOptIn.optedOut).waitFor();
		},
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'text-updates-loading',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: { notifications: 'pending' },
		anchor: (copy) => copy.guestView.identityIndicator.notificationsLoading,
	},
	{
		id: 'text-updates-unavailable',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: { notifications: 'unreachable' },
		anchor: (copy) => copy.guestView.identityIndicator.notificationsError,
	},
	{
		id: 'identity-menu',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: enabledTexts,
		overlay: true,
		interact: openIdentityMenu,
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'device-id',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: enabledTexts,
		overlay: true,
		interact: async (page, copy) => {
			const { identityIndicator } = copy.guestView;

			await openIdentityMenu(page, copy);
			await page.getByRole('menuitem', { name: identityIndicator.showDeviceId }).click();
			await page.getByRole('dialog', { name: identityIndicator.deviceIdDialogTitle }).waitFor();
		},
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'forget-information',
		guest: 'identified',
		market: REGISTRATION_OPEN,
		server: enabledTexts,
		overlay: true,
		interact: async (page, copy) => {
			const { identityIndicator } = copy.guestView;

			await openIdentityMenu(page, copy);
			await page.getByRole('menuitem', { name: identityIndicator.forgetInformation }).click();
			await page.getByRole('dialog', { name: identityIndicator.forgetDialogTitle }).waitFor();
		},
		anchor: (copy) => copy.formTitle,
	},
	{
		id: 'qr-poster',
		route: '/qr-code',
		anchor: (copy) => copy.qrCodeTitle,
	},
];

export class ScreenshotCatalog {
	constructor(private readonly all: readonly ScreenshotStep[] = screenshots) {}

	get ids(): string[] {
		return this.all.map((step) => step.id);
	}

	/**
	 * The named screenshots in catalog order, or all of them when none are named. A name the catalog does
	 * not know stops the run: a page that embeds a screenshot under a name nobody captures is the same
	 * mistake from the other side, and this is the side that can say so.
	 */
	select(only: readonly string[] = []): ScreenshotStep[] {
		const unknown = only.filter((id) => !this.all.some((step) => step.id === id));

		if (unknown.length > 0) {
			throw new Error(
				`No screenshot named ${unknown.join(', ')}. Known screenshots: ${this.ids.join(', ')}.`,
			);
		}

		return only.length === 0 ? [...this.all] : this.all.filter((step) => only.includes(step.id));
	}
}
