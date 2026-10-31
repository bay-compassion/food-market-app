import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ChecklistView } from './ChecklistView';
import { KioskUnlockDialog } from './KioskUnlockDialog';

type Session = 'scheduled' | 'underway' | 'missing';

type ChecklistViewArgs = { session: Session; onNavigateSchedule: () => void };

const t = adminTranslations.en.checklist;

const sessionStatus: Record<Exclude<Session, 'missing'>, SessionStatusEnum> = {
	scheduled: SessionStatusEnum.SCHEDULED,
	underway: SessionStatusEnum.REGISTRATION_OPEN,
};

/**
 * A store with the chosen session, an online printing station, and an unlock code ready for the
 * room display. The dialog the code opens is mounted by the dashboard's layout, so the fixture
 * mounts it here.
 */
function SeededChecklist({ session, onNavigateSchedule }: ChecklistViewArgs) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (path: string) =>
			Promise.resolve(
				path.includes('kiosk')
					? Response.json({
							code: '482913',
							expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
						})
					: Response.json({ online: true }),
			);
		const created = new RootStore({
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
							id: 'checklist-story',
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
	return <SeededChecklist key={args.session} {...args} />;
}

/** What to set up at the market by hand before a session: the room display, check-in, and the session. */
const meta = {
	title: 'Admin/Checklist/Checklist',
	component: Fixture,
	parameters: { shell: 'admin' },
	argTypes: { session: { control: 'inline-radio', options: ['scheduled', 'underway', 'missing'] } },
	args: { session: 'scheduled', onNavigateSchedule: fn() },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The next session is on the schedule. */
export const Scheduled: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('heading', { name: t.roomDisplay.title })).toBeVisible();
		await expect(canvas.getByRole('heading', { name: t.checkIn.title })).toBeVisible();
		await expect(canvas.getByText(`${window.location.host}/kiosk`)).toBeVisible();
		await expect(canvas.getByRole('link', { name: t.checkIn.openQueueDesk })).toHaveAttribute(
			'href',
			'/queue',
		);
		await expect(canvas.queryByRole('button', { name: t.session.openSchedule })).toBeNull();
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

/** Registration has opened: there is nothing left to check about the session. */
export const Underway: Story = {
	args: { session: 'underway' },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByText(t.session.underway)).toBeVisible();
	},
};

/** No session is on the schedule, so the step points to where one is added. */
export const Missing: Story = {
	args: { session: 'missing' },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText(t.session.missing)).toBeVisible();
		await userEvent.click(canvas.getByRole('button', { name: t.session.openSchedule }));
		await expect(args.onNavigateSchedule).toHaveBeenCalled();
	},
};
