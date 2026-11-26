import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../../adminLocales';
import type { GuestNoteRecord } from '../../../models/guest-note';
import type {
	GuestProfileRecord,
	GuestProfileVisit,
	RelatedGuestRecord,
} from '../../../models/guest-profile';
import type { AdminApi } from '../../../services/admin-api';
import type { Permission } from '../../../services/permissions';
import { SessionStatusEnum } from '../../../services/sessionStateMachine';
import type { VisitEvent } from '../../../services/visit-events';
import type { SessionOverview } from '../../../stores/market-session.store';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { ConfirmationDrawer } from '../../ui/ConfirmationDrawer';
import { NotificationToasts } from '../../ui/NotificationToasts';
import { GuestProfileView } from './GuestProfileView';

const t = adminTranslations.en.guestProfile;
const sessionId = 'story-session';

/**
 * One guest's profile, opened from the guest database: who they are, their record in four numbers,
 * their visit in today's session with the queue's own actions, their household, the visits before
 * today's, and the notes staff keep about them.
 *
 * Each story builds its own store, whose admin API answers with the story's guest, rather than
 * replacing `window.fetch`, which every story on a docs page would share. The names are invented.
 */

function visit(overrides: Partial<GuestProfileVisit>): GuestProfileVisit {
	return {
		id: 'visit',
		marketEventId: 'past',
		visitDate: '2026-11-19',
		status: 'served',
		track: 'lottery',
		queuePosition: 41,
		priorityNumber: null,
		queueFront: false,
		queueOrder: 41,
		householdSize: 4,
		childrenCount: 2,
		seniorsCount: 1,
		ageRange: '30-44',
		source: 'self',
		calledAt: null,
		servedAt: null,
		createdAt: '2026-11-19T17:00:00.000Z',
		...overrides,
	};
}

const regular: GuestProfileRecord = {
	guestId: 'guest-maria',
	firstName: 'Maria',
	lastName: 'Lopez',
	pronunciation: 'mah-REE-ah LOH-pez',
	phone: '(415) 555-0142',
	locale: 'es',
	createdAt: '2025-03-12T17:00:00.000Z',
	onPhone: true,
	textAlerts: true,
	visits: [
		visit({
			id: 'today',
			marketEventId: sessionId,
			visitDate: '2026-11-26',
			status: 'waiting',
			queuePosition: 23,
			queueOrder: 23,
			createdAt: '2026-11-26T17:02:00.000Z',
		}),
		visit({ id: 'nov-19' }),
		visit({ id: 'nov-12', visitDate: '2026-11-12', status: 'no_show', queuePosition: 88 }),
		visit({
			id: 'oct-29',
			visitDate: '2026-10-29',
			track: 'premarket',
			queuePosition: null,
			queueOrder: null,
		}),
		visit({
			id: 'sep-24',
			visitDate: '2026-09-24',
			householdSize: 3,
			childrenCount: 1,
			queuePosition: 12,
			source: 'admin',
		}),
	],
};

function note(overrides: Partial<GuestNoteRecord>): GuestNoteRecord {
	return {
		id: 'note',
		guestId: regular.guestId,
		marketEventId: null,
		kind: 'text',
		body: null,
		categoryId: null,
		categoryLabel: null,
		authorId: 'auth0|priya',
		authorName: 'Priya S.',
		createdAt: '2026-10-22T18:00:00.000Z',
		updatedAt: '2026-10-22T18:00:00.000Z',
		editable: true,
		...overrides,
	};
}

const notes: GuestNoteRecord[] = [
	note({
		id: 'note-escalate',
		body: 'Asked twice about delivering to a neighbor who can’t come in. Talk with her before calling.',
		categoryId: 'escalate',
		categoryLabel: 'Escalate to Lead',
		authorName: 'Jamie K.',
		createdAt: '2026-11-19T18:00:00.000Z',
		editable: false,
	}),
	note({
		id: 'note-knee',
		body: 'Prefers the shorter line at the produce table — knee trouble.',
		categoryId: 'access',
		categoryLabel: 'Accessibility',
	}),
	note({
		id: 'note-screenshot',
		kind: 'screenshot_notice',
		createdAt: '2026-09-24T18:00:00.000Z',
	}),
];

const events: VisitEvent[] = [
	{
		id: 'event-registered',
		kind: 'registered',
		toStatus: 'registered',
		actor: { kind: 'guest' },
		details: {},
		createdAt: '2026-11-19T17:02:00.000Z',
	},
	{
		id: 'event-called',
		kind: 'called',
		toStatus: 'called',
		actor: { kind: 'worker', id: 'auth0|jamie', name: 'Jamie K.' },
		details: {},
		createdAt: '2026-11-19T18:48:00.000Z',
	},
	{
		id: 'event-served',
		kind: 'served',
		toStatus: 'served',
		actor: { kind: 'worker', id: 'auth0|priya', name: 'Priya S.' },
		details: {},
		createdAt: '2026-11-19T19:05:00.000Z',
	},
];

const related: RelatedGuestRecord[] = [
	{
		guestId: 'guest-maria-by-hand',
		firstName: 'Maria',
		lastName: 'Lopez',
		phone: '(415) 555-0142',
		createdAt: '2025-06-04T17:00:00.000Z',
		visitCount: 1,
		lastVisitDate: '2025-06-04',
		relation: 'same-person',
	},
	{
		guestId: 'guest-ana',
		firstName: 'Ana',
		lastName: 'Lopez',
		phone: '(415) 555-0199',
		createdAt: '2026-01-10T17:00:00.000Z',
		visitCount: 2,
		lastVisitDate: '2026-11-12',
		relation: 'household',
	},
];

type GuestProfileViewArgs = {
	permissions: Permission[];
	record: GuestProfileRecord;
	notes: GuestNoteRecord[];
	inSession: boolean;
	loadFails: boolean;
};

function View({ permissions, record, notes, inSession, loadFails }: GuestProfileViewArgs) {
	const [store] = useState(() => {
		const api = {
			getGuestProfile: async () => {
				if (loadFails) {
					throw new Error('network');
				}

				return record;
			},
			listGuestNotes: async () => notes,
			listVisitEvents: async () => events,
			listRelatedGuests: async () => related,
			listGuestNoteCategories: async () => [],
			listAllGuests: async () => [],
			listSessionGuests: async () => [],
		} as unknown as AdminApi;
		const overview: SessionOverview = {
			event: inSession
				? {
						id: sessionId,
						status: SessionStatusEnum.SERVICE_STARTED,
						capacity: 100,
						registrationOpensAt: '2026-11-26T17:00:00.000Z',
						registrationClosesAt: '2026-11-26T17:15:00.000Z',
					}
				: null,
			questions: [],
			counts: {},
		};
		const created = new RootStore({
			admin: { api, readPermissions: async () => permissions },
			session: { fetch: async () => Response.json(overview) },
		});

		created.session.applyServerState(overview);
		void created.admin.loadPermissions();

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<GuestProfileView guestId={record.guestId} onBack={fn()} onOpenGuest={fn()} />
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Guest Database/Guest Profile',
	component: View,
	parameters: { shell: 'admin' },
	args: {
		permissions: ['run:queue', 'read:guest-profiles'],
		record: regular,
		notes,
		inSession: true,
		loadFails: false,
	},
} satisfies Meta<typeof View>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A regular in today's session: their ticket and its actions lead, then the record behind it. */
export const InTodaysSession: Story = {
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('heading', { name: 'Maria Lopez' })).toBeVisible();
		await expect(canvas.getByRole('region', { name: t.todayTitle })).toBeVisible();

		const earlier = within(canvas.getByRole('region', { name: t.recentTitle }));

		// Today's visit is the ticket above; the Overview lists the latest three of the other four.
		await expect(earlier.getAllByRole('listitem')).toHaveLength(3);
		await expect(earlier.getByRole('button', { name: t.seeAllVisits })).toBeVisible();
		await expect(
			canvas.getByText(t.householdWas.replace('{size}', '3').replace('{date}', 'Sep 24'), {
				exact: false,
			}),
		).toBeVisible();
	},
};

/**
 * The Visits tab: every visit, newest first. Opening one shows what happened to it, who did it, and
 * when — the same history the queue's ticket shows.
 */
export const Visits: Story = {
	play: async ({ canvas }) => {
		await canvas.findByRole('heading', { name: 'Maria Lopez' });
		await userEvent.click(canvas.getByRole('tab', { name: t.visitsTab }));

		const visits = within(canvas.getByRole('list', { name: t.visitsTab }));
		const [, lastWeek] = visits.getAllByRole('button');

		await expect(visits.getAllByRole('listitem')).toHaveLength(regular.visits.length);
		await userEvent.click(lastWeek!);
		await expect(lastWeek).toHaveAttribute('aria-expanded', 'true');
		await expect(
			await canvas.findByRole('region', { name: adminTranslations.en.queueDesk.history.title }),
		).toHaveTextContent('Priya S.');
	},
};

/**
 * The Notes tab: every note, newest first, with a filter for each category they are filed under,
 * and how many times the guest has been told screenshots are not accepted. The Overview shows only
 * the newest.
 */
export const Notes: Story = {
	play: async ({ canvas }) => {
		const notesCopy = adminTranslations.en.queueDesk.guestNotes;

		await canvas.findByRole('heading', { name: 'Maria Lopez' });
		await userEvent.click(await canvas.findByRole('button', { name: 'All 3 Notes' }));
		await expect(canvas.getByRole('tab', { name: t.notesTab })).toHaveAttribute(
			'aria-selected',
			'true',
		);

		const filters = within(await canvas.findByRole('group', { name: notesCopy.filterLabel }));

		await userEvent.click(filters.getByRole('button', { name: 'Accessibility · 1' }));
		await expect(canvas.getByText(/knee trouble/)).toBeVisible();
		await expect(canvas.queryByText(/delivering to a neighbor/)).not.toBeInTheDocument();
	},
};

/**
 * The Records tab for a team leader: the other records linked to this guest by phone — likely the
 * same person first — and whether their record is on a phone. Nothing here is theirs to change.
 */
export const Records: Story = {
	play: async ({ canvas }) => {
		const t = adminTranslations.en.guestProfile;

		await canvas.findByRole('heading', { name: 'Maria Lopez' });
		await userEvent.click(canvas.getByRole('tab', { name: t.recordsTab }));

		const linked = within(await canvas.findByRole('list', { name: t.sameTitle }));

		await expect(linked.getAllByRole('listitem')[0]).toHaveTextContent(t.samePerson);
		await expect(linked.getAllByRole('listitem')[1]).toHaveTextContent(t.sameHousehold);
		await expect(canvas.getByText(t.onPhone)).toBeVisible();
		await expect(canvas.queryByRole('button', { name: t.moveToPhone })).not.toBeInTheDocument();
		await expect(canvas.queryByText(t.oddsTitle)).not.toBeInTheDocument();
	},
};

/**
 * The same tab for an admin who is also a lottery steward and the data steward: the QR code that
 * moves the record to a new phone, the way to the guest's odds, and permanent deletion.
 */
export const RecordsForAStewardAdmin: Story = {
	args: {
		permissions: [
			'run:queue',
			'read:guest-profiles',
			'manage:guest-access',
			'read:stewardship',
			'delete:guest-data',
		],
	},
	play: async ({ canvas }) => {
		const t = adminTranslations.en;

		await canvas.findByRole('heading', { name: 'Maria Lopez' });
		await userEvent.click(canvas.getByRole('tab', { name: t.guestProfile.recordsTab }));
		await expect(
			await canvas.findByRole('button', { name: t.guestProfile.moveToPhone }),
		).toBeVisible();
		await expect(canvas.getByRole('link', { name: t.guestProfile.openStewardArea })).toBeVisible();
		await expect(canvas.getByRole('button', { name: t.guestDeleteShow })).toBeVisible();
	},
};

/** Between sessions there is no visit today: the profile is the record alone. */
export const BetweenSessions: Story = {
	args: { inSession: false },
	play: async ({ canvas }) => {
		await canvas.findByRole('heading', { name: 'Maria Lopez' });
		await expect(canvas.queryByRole('region', { name: t.todayTitle })).not.toBeInTheDocument();
	},
};

/** Someone who saved their details but has never come: no household, no visits yet. */
export const NoVisitYet: Story = {
	args: {
		inSession: false,
		notes: [],
		record: {
			...regular,
			guestId: 'guest-rosa',
			firstName: 'Rosa',
			lastName: 'Gutierrez',
			pronunciation: null,
			visits: [],
		},
	},
	play: async ({ canvas }) => {
		await canvas.findByRole('heading', { name: 'Rosa Gutierrez' });
		await expect(canvas.getByText(t.noHousehold)).toBeVisible();
		await expect(canvas.getByText(t.noPastVisits)).toBeVisible();
	},
};

/** The record could not be read: the screen says so and offers to try again. */
export const LoadFailed: Story = {
	args: { loadFails: true },
	play: async ({ canvas }) => {
		// The toast says it too, so the screen's own message is found by its retry button.
		await expect(await canvas.findByRole('button', { name: t.retry })).toBeVisible();
		await expect(canvas.getAllByText(t.loadFailed).length).toBeGreaterThan(0);
	},
};
