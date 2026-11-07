import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { StorageKey } from '../../services/storage.service';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { MemoryStorage } from '../guest-view/memory-storage.fixture';
import {
	printStationFirstRunCommand,
	printStationLaunchCommand,
} from '../print-station/PrintStationSetup';
import { ChecklistView } from './ChecklistView';
import { KioskUnlockDialog } from './KioskUnlockDialog';

type Session = 'scheduled' | 'underway' | 'missing';
type Station = 'online' | 'offline';
type Ticked = 'none' | 'roomDisplay';

type ChecklistViewArgs = {
	session: Session;
	station: Station;
	ticked: Ticked;
	onNavigateSchedule: () => void;
};

const t = adminTranslations.en.checklist;
const printing = adminTranslations.en.printStationCard;
const sessionId = 'checklist-story';

const sessionStatus: Record<Exclude<Session, 'missing'>, SessionStatusEnum> = {
	scheduled: SessionStatusEnum.SCHEDULED,
	underway: SessionStatusEnum.REGISTRATION_OPEN,
};

/**
 * A store with the chosen session, printing station, and ticks, and an unlock code ready for the
 * room display. Its browser storage is its own, so ticking a step in one story never ticks it in
 * another on the same docs page. The dialog the code opens is mounted by the dashboard's layout, so
 * the fixture mounts it here.
 */
function SeededChecklist({ session, station, ticked, onNavigateSchedule }: ChecklistViewArgs) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (path: string) =>
			Promise.resolve(
				path.includes('kiosk')
					? Response.json({
							code: '482913',
							expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
						})
					: Response.json({ online: station === 'online' }),
			);
		const browserStorage = new MemoryStorage();

		if (ticked === 'roomDisplay') {
			browserStorage.setItem(
				StorageKey.CHECKLIST_PROGRESS,
				JSON.stringify({ sessionId, steps: t.roomDisplay.steps.map((step) => step.id) }),
			);
		}

		const created = new RootStore({
			browserStorage,
			admin: {
				api: new AdminApi({ request: request as unknown as typeof fetch }),
				readPermissions: async () => ['manage:sessions', 'run:queue'],
			},
			session: { fetch: () => new Promise(() => {}) },
		});
		const opensAt = new Date(Date.now() + 2 * 24 * 3_600_000);

		created.session.applyServerState({
			event:
				session === 'missing'
					? null
					: {
							id: sessionId,
							status: sessionStatus[session],
							capacity: 120,
							registrationOpensAt: opensAt.toISOString(),
							registrationClosesAt: new Date(opensAt.valueOf() + 15 * 60_000).toISOString(),
						},
			questions: [],
			counts: {},
		});
		void created.admin.loadPermissions().then(() => created.admin.checkPrintStation());

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<ChecklistView onNavigateSchedule={onNavigateSchedule} />
			<KioskUnlockDialog />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: ChecklistViewArgs) {
	return <SeededChecklist key={`${args.session}-${args.station}-${args.ticked}`} {...args} />;
}

/**
 * What to set up at the market by hand before a session: whether there is a session, then the room
 * display and the check-in computer, each ticked off step by step on this device.
 */
const meta = {
	title: 'Admin/Checklist/Checklist',
	component: Fixture,
	parameters: { shell: 'admin' },
	argTypes: {
		session: { control: 'inline-radio', options: ['scheduled', 'underway', 'missing'] },
		station: { control: 'inline-radio', options: ['online', 'offline'] },
		ticked: { control: 'inline-radio', options: ['none', 'roomDisplay'] },
	},
	args: { session: 'scheduled', station: 'offline', ticked: 'none', onNavigateSchedule: fn() },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The next session is on the schedule and nothing is set up yet. */
export const Scheduled: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('img', { name: t.floorPlan.alt })).toBeVisible();
		await expect(canvas.getByRole('heading', { name: t.roomDisplay.title })).toBeVisible();
		await expect(canvas.getByRole('heading', { name: t.checkIn.title })).toBeVisible();
		await expect(canvas.getByRole('img', { name: t.roomDisplay.hardware.alt })).toBeVisible();
		await expect(canvas.getByText(`${window.location.host}/kiosk`)).toBeVisible();
		await expect(canvas.getByRole('link', { name: t.checkIn.openQueueDesk })).toHaveAttribute(
			'href',
			'/queue',
		);
		await expect(canvas.queryByText(printStationLaunchCommand)).toBeNull();
		await expect(canvas.queryByRole('button', { name: t.session.openSchedule })).toBeNull();
		await expect(await canvas.findByText(t.checkIn.queueDeskWait)).toBeVisible();
	},
};

/** Ticking a step strikes it through and moves its station's count on. */
export const TickAStep: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const step = t.roomDisplay.steps[0]!;

		await userEvent.click(canvas.getByRole('checkbox', { name: step.title }));

		await expect(canvas.getByRole('checkbox', { name: step.title })).toBeChecked();
		await expect(
			canvas.getByText(
				`${t.roomDisplay.place} · ${t.progress.replace('{done}', '1').replace('{total}', '4')}`,
			),
		).toBeVisible();
	},
};

/** Once the printing station checks in, the app ticks its "wait for Online" step itself. */
export const PrinterOnline: Story = {
	args: { station: 'online' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const step = printing.steps.at(-1)!;

		await waitFor(() => expect(canvas.getByRole('checkbox', { name: step.title })).toBeChecked());
		await expect(canvas.getByRole('checkbox', { name: step.title })).toBeDisabled();
		await expect(canvas.getByText(t.automatic)).toBeVisible();
		await expect(canvas.queryByText(t.checkIn.queueDeskWait)).toBeNull();
	},
};

/** A station with every step ticked folds down to its heading, and opens again on a tap. */
export const StationComplete: Story = {
	args: { ticked: 'roomDisplay' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = canvas.getByRole('button', { name: t.showSteps });
		// Found even while hidden, so the test sees whether it is actually drawn.
		const closeUp = canvas.getByRole('img', { name: t.roomDisplay.closeUpAlt, hidden: true });

		await expect(canvas.getByText(`${t.roomDisplay.place} · ${t.complete}`)).toBeVisible();
		await expect(closeUp).not.toBeVisible();

		await userEvent.click(toggle);

		await expect(closeUp).toBeVisible();

		await expect(toggle).toHaveAccessibleName(t.hideSteps);
		await userEvent.click(toggle);

		await expect(closeUp).not.toBeVisible();
	},
};

/** The room display's code comes from the same dialog the queue screen's menu opens. */
export const UnlockCode: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(canvas.getByRole('button', { name: t.roomDisplay.getCode }));

		await expect(await within(document.body).findByText('482913')).toBeVisible();
	},
};

/**
 * The room display's Mac mini is too old to trust the app's certificate; the link under its address
 * opens the troubleshooting fix further down.
 */
export const CertificateHelp: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const problem = printing.troubleshooting.find(({ id }) => id === 'certificate-warning')!;

		await userEvent.click(canvas.getByRole('button', { name: t.roomDisplay.certificateHelp }));

		await expect(
			await canvas.findByText(problem.fix.replaceAll('{host}', window.location.host)),
		).toBeVisible();
		await waitFor(() =>
			expect(canvas.getByRole('button', { name: problem.problem })).toHaveFocus(),
		);
	},
};

/** Registration has opened: there is nothing left to check about the session. */
export const Underway: Story = {
	args: { session: 'underway' },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByText(t.session.underway)).toBeVisible();
	},
};

/** No session is on the schedule: the banner points to where one is added, and nothing ticks. */
export const Missing: Story = {
	args: { session: 'missing' },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText(t.session.missing)).toBeVisible();
		await expect(
			canvas.getByRole('checkbox', { name: t.roomDisplay.steps[0]!.title }),
		).toBeDisabled();
		await userEvent.click(canvas.getByRole('button', { name: t.session.openSchedule }));
		await expect(args.onNavigateSchedule).toHaveBeenCalled();
	},
};

/**
 * Troubleshooting, starting the printing station by hand, and first-time setup are folded below the
 * stations. Opened, the by-hand section gives the market-day command, and setup gives the one that
 * prints through the dialog.
 */
export const WhenYouNeedIt: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const problem = printing.troubleshooting[0]!;

		await userEvent.click(canvas.getByRole('button', { name: t.reference.troubleshootingTitle }));
		await userEvent.click(canvas.getByRole('button', { name: problem.problem }));

		await expect(canvas.getByText(problem.fix)).toBeVisible();

		await expect(canvas.queryByText(printStationLaunchCommand)).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: t.reference.byHandTitle }));

		await expect(canvas.getByText(printStationLaunchCommand)).toBeVisible();
		await expect(canvas.getByRole('link', { name: printing.open })).toHaveAttribute(
			'href',
			`${window.location.origin}/printing-station`,
		);

		await expect(canvas.queryByText(printStationFirstRunCommand)).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: t.reference.setupTitle }));

		await expect(canvas.getByText(printStationFirstRunCommand)).toBeVisible();
		await expect(printStationFirstRunCommand).not.toContain('--kiosk-printing');
		await expect(printStationLaunchCommand).toContain('--kiosk-printing');
	},
};

/**
 * The floor plan opens zoomed in on the two stations, zooms from the buttons over it, and Reset
 * goes back to where it opened.
 */
export const ZoomFloorPlan: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const content = () =>
			canvasElement.querySelector<HTMLElement>('.react-transform-component')?.style.transform;

		await waitFor(() =>
			expect(canvas.getByRole('button', { name: t.floorPlan.zoomOut })).toBeEnabled(),
		);
		const opening = content();

		await userEvent.click(canvas.getByRole('button', { name: t.floorPlan.zoomIn }));
		await waitFor(() => expect(content()).not.toBe(opening));

		await userEvent.click(canvas.getByRole('button', { name: t.floorPlan.reset }));
		await waitFor(() => expect(content()).toBe(opening));
	},
};
