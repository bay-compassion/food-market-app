import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../../adminLocales';
import type { GuestNoteRecord } from '../../../models/guest-note';
import type { GuestProfileRecord, GuestProfileVisit } from '../../../models/guest-profile';
import type { AdminApi } from '../../../services/admin-api';
import { SessionStatusEnum } from '../../../services/sessionStateMachine';
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

const notes: GuestNoteRecord[] = [
	{
		id: 'note-1',
		guestId: regular.guestId,
		marketEventId: null,
		kind: 'text',
		body: 'Prefers the shorter line at the produce table — knee trouble.',
		categoryId: null,
		categoryLabel: null,
		authorId: 'auth0|priya',
		authorName: 'Priya S.',
		createdAt: '2026-10-22T18:00:00.000Z',
		updatedAt: '2026-10-22T18:00:00.000Z',
		editable: true,
	},
];

type GuestProfileViewArgs = {
	record: GuestProfileRecord;
	notes: GuestNoteRecord[];
	inSession: boolean;
	loadFails: boolean;
};

function View({ record, notes, inSession, loadFails }: GuestProfileViewArgs) {
	const [store] = useState(() => {
		const api = {
			getGuestProfile: async () => {
				if (loadFails) {
					throw new Error('network');
				}

				return record;
			},
			listGuestNotes: async () => notes,
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
			admin: { api, readPermissions: async () => ['run:queue', 'read:guest-profiles'] },
			session: { fetch: async () => Response.json(overview) },
		});

		created.session.applyServerState(overview);
		void created.admin.loadPermissions();

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<GuestProfileView guestId={record.guestId} onBack={fn()} />
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Guest Database/Guest Profile',
	component: View,
	parameters: { shell: 'admin' },
	args: { record: regular, notes, inSession: true, loadFails: false },
} satisfies Meta<typeof View>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A regular in today's session: their ticket and its actions lead, then the record behind it. */
export const InTodaysSession: Story = {
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('heading', { name: 'Maria Lopez' })).toBeVisible();
		await expect(canvas.getByRole('region', { name: t.todayTitle })).toBeVisible();

		const earlier = within(canvas.getByRole('region', { name: t.recentTitle }));

		// Today's visit is the ticket above, so the earlier visits are the other four.
		await expect(earlier.getAllByRole('listitem')).toHaveLength(4);
		await expect(
			canvas.getByText(t.householdWas.replace('{size}', '3').replace('{date}', 'Sep 24'), {
				exact: false,
			}),
		).toBeVisible();
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
