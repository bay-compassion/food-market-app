import type { Page } from 'playwright';

import type { Translation } from '../../src/locales.js';
import type { CustomNotification, DeliveryType } from '../../src/services/notification-copy.js';
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

/** A text message a guest is sent, rather than a screen they see. */
export type MessageScene = {
	type: DeliveryType;
	queuePosition?: number;
	/** The wording of a broadcast, which staff write each time. */
	custom?: CustomNotification;
};

/**
 * One beat of an arc: a whole screen of the running app — or a text message — and what it shows.
 *
 * A step is described by the state the app is in rather than by a component, because the still is
 * the app — app bar, footer, and all — not a piece of it. The state is what a guest's phone and the
 * server would say: what is saved on the device, what today's market is doing, and what their visit
 * is. `interact` then takes the guest one step further, for a beat that is not a resting state.
 */
export type StillStep = {
	/** Names the still's PNG, and never changes: a doc can point at it and get the latest one. */
	id: string;
	/** The beat, in the arc's words. Printed above the still. */
	caption: string;
	/** A caveat for the reader, printed under the caption: what is an example, or not shown as is. */
	note?: string;
	/** Where the phone is pointed. Defaults to the guest home screen. */
	route?: string;
	/** Defaults to `returning`. */
	guest?: GuestProfile;
	/** What today's market is doing, or `null` when none is scheduled. Defaults to `null`. */
	market?: SessionStatusEnum | null;
	visit?: VisitScene;
	server?: ServerScene;
	/** A text message to print instead of a screen. */
	message?: MessageScene;
	/** What a guest does after the screen has settled, before it is photographed. */
	interact?: (page: Page, copy: Translation) => Promise<void>;
	/**
	 * A sheet or dialog is open, so the still is the screen a guest sees rather than the whole page
	 * scrolled out flat behind it.
	 */
	overlay?: boolean;
	/**
	 * Text that must be on screen before the photograph is taken. Written against the copy rather
	 * than as a literal, so a wording change follows itself — and so a beat that never reaches its
	 * screen (a route that moved, a fixture the app stopped understanding) stops the run instead of
	 * printing a spinner in the middle of an arc.
	 */
	anchor: (copy: Translation) => string;
};

export type StillArc = {
	id: string;
	title: string;
	/** One line, under the title on the contents page and on the section's own sheet. */
	summary: string;
	/**
	 * The section's explanation, in the author's words, printed on a sheet of its own ahead of the
	 * stills. Paragraphs are separated by a blank line.
	 */
	details?: string;
	steps: StillStep[];
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
 * The arcs, in the order they should come off the printer.
 *
 * These are a hand-picked set of what a guest actually sees, as the app shows it. Storybook is the
 * inventory of every state a component can hold; this is the edit. A step earns its place by being
 * a different moment in a guest's day, so two states that differ only in a detail contribute one
 * still between them.
 */
export const stillArcs: StillArc[] = [
	{
		id: 'in-action',
		title: 'Screens that appear after a guest acts',
		summary: 'Reached only by doing something: saving details, or asking to give up a place.',
		steps: [
			{
				id: 'identity-saved',
				caption: 'Identity form — saved',
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
				caption: 'Asked to confirm before giving up their place',
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
		],
	},
	{
		id: 'loading-unavailable',
		title: 'Loading and unavailable',
		summary: 'What a guest sees while the market is being looked up, and when it cannot be.',
		steps: [
			{
				id: 'market-loading',
				caption: 'Checking the market’s status',
				server: { market: 'pending' },
				anchor: (copy) => copy.statusLoading,
			},
			{
				id: 'market-unavailable',
				caption: 'The market’s status could not be loaded',
				note: 'The guest is told the market is closed, whatever its real state.',
				server: { market: 'unreachable' },
				anchor: (copy) => copy.guestView.notOpenState.heading,
			},
		],
	},
	{
		id: 'text-updates',
		title: 'Text updates',
		summary: 'Agreeing to text messages, and the states that setting can be in.',
		steps: [
			{
				id: 'text-updates',
				caption: 'Asked to agree to text messages',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				overlay: true,
				interact: openTextUpdates,
				anchor: (copy) => copy.formTitle,
			},
			{
				id: 'text-updates-agreed',
				caption: 'Agreed — the button is now available',
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
				caption: 'Agreed, but it did not go through',
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
				caption: 'Text updates are on',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				server: enabledTexts,
				anchor: (copy) => copy.guestView.identityIndicator.notificationsEnabled,
			},
			{
				id: 'text-updates-opted-out',
				caption: 'Texted STOP earlier — how to turn updates back on',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				server: { notifications: 'opted-out' },
				overlay: true,
				interact: async (page, copy) => {
					await openTextUpdates(page, copy);
					await page
						.getByRole('dialog')
						.getByText(copy.guestView.notificationOptIn.optedOut)
						.waitFor();
				},
				anchor: (copy) => copy.formTitle,
			},
			{
				id: 'text-updates-loading',
				caption: 'Checking whether text updates are on',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				server: { notifications: 'pending' },
				anchor: (copy) => copy.guestView.identityIndicator.notificationsLoading,
			},
			{
				id: 'text-updates-unavailable',
				caption: 'Could not check whether text updates are on',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				server: { notifications: 'unreachable' },
				anchor: (copy) => copy.guestView.identityIndicator.notificationsError,
			},
		],
	},
	{
		id: 'identity-menu',
		title: 'Identity menu',
		summary: 'What a guest can do with the details saved on their phone.',
		steps: [
			{
				id: 'identity-menu',
				caption: 'The menu on the “recognized on this device” card',
				guest: 'identified',
				market: REGISTRATION_OPEN,
				server: enabledTexts,
				overlay: true,
				interact: openIdentityMenu,
				anchor: (copy) => copy.formTitle,
			},
			{
				id: 'device-id',
				caption: 'Show device ID',
				note: 'The ID shown is made up.',
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
				caption: 'Forget my information — asked to confirm',
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
		],
	},
	{
		id: 'qr-codes',
		title: 'QR codes',
		summary: 'The poster that gets a guest to the app.',
		steps: [
			{
				id: 'qr-poster',
				caption: 'The printable poster that points guests at the app',
				note: 'The web address under the code is the one this sheet was made from; the printed poster shows the live site’s. Back and Print do not appear on paper.',
				route: '/qr-code',
				anchor: (copy) => copy.qrCodeTitle,
			},
		],
	},
	{
		id: 'text-messages',
		title: 'Text messages',
		summary:
			'What a guest is texted. Shaded text is required on every message — it is not optional, ' +
			'and it is not translated.',
		steps: [
			{
				id: 'sms-registered',
				caption: 'Registered for the lottery',
				message: { type: 'registration_confirmed' },
				anchor: (copy) => copy.notificationRegisteredTitle,
			},
			{
				id: 'sms-registration-closed',
				caption: 'Registration has closed',
				message: { type: 'registration_closed' },
				anchor: (copy) => copy.notificationRegistrationClosedTitle,
			},
			{
				id: 'sms-selected',
				caption: 'Selected in the lottery — with a place in line',
				message: { type: 'lottery_selected', queuePosition: 7 },
				anchor: (copy) => copy.notificationSelectedTitle,
			},
			{
				id: 'sms-not-selected',
				caption: 'Not selected in the lottery',
				message: { type: 'lottery_not_selected' },
				anchor: (copy) => copy.notificationNotSelectedTitle,
			},
			{
				id: 'sms-called',
				caption: 'Called to the entrance',
				message: { type: 'called' },
				anchor: (copy) => copy.notificationCalledTitle,
			},
			{
				id: 'sms-broadcast',
				caption: 'A broadcast from the market team',
				note: 'Example wording. Staff write each broadcast, so its words are never translated.',
				message: {
					type: 'broadcast',
					custom: {
						title: 'Market update',
						body: 'We are running about fifteen minutes behind. Thank you for your patience.',
					},
				},
				anchor: () => 'Market update',
			},
		],
	},
];

export type StillSection = {
	arc: StillArc;
	steps: StillStep[];
};

export class StillCatalog {
	constructor(private readonly allArcs: readonly StillArc[] = stillArcs) {}

	get arcIds(): string[] {
		return this.allArcs.map((arc) => arc.id);
	}

	/** The requested arcs in catalog order, or all of them when none are named. */
	sections(onlyArcIds?: readonly string[]): StillSection[] {
		const wanted = onlyArcIds && onlyArcIds.length > 0 ? new Set(onlyArcIds) : undefined;

		return this.allArcs
			.filter((arc) => !wanted || wanted.has(arc.id))
			.map((arc) => ({ arc, steps: arc.steps }));
	}
}
