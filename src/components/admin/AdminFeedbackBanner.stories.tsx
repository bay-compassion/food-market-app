import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi, type ManualGuest } from '../../services/admin-api';
import type { GuestAdmission } from '../../services/guestAdmission';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { AdminFeedbackBanner } from './AdminFeedbackBanner';

/**
 * The line under an admin screen's heading that reports the worker's last action. After a manual
 * add it also offers the QR code that puts the new record on the guest's own phone — except for a
 * `served` record, which is written after the guest has left.
 *
 * Each story adds a guest through a stubbed API, so the banner shows what the real add leaves
 * behind rather than a hand-built feedback object.
 */
type AdminFeedbackBannerArgs = { admission: GuestAdmission };

const t = adminTranslations.en;
const originalFetch = window.fetch.bind(window);

const guest: ManualGuest = {
	firstName: 'Ada',
	lastName: 'Lovelace',
	ageRange: '',
	householdSize: 2,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '510-555-0123',
	queuePlacement: 'end',
	admission: 'queue',
	lotteryWeightTier: 'standard',
};

function adminResponse(url: string, init?: RequestInit): Response {
	if (url === '/api/admin/guests' && init?.method === 'POST') {
		return Response.json({ id: 'visit-1', guestId: 'guest-1', status: 'waiting' }, { status: 201 });
	}

	if (url === '/api/admin/guest-claims') {
		return Response.json(
			{
				token: 'claim-token-shown-as-a-qr-code-1234567890abcdef',
				expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
			},
			{ status: 201 },
		);
	}

	return Response.json([]);
}

const withAddedGuest: Decorator = (Story, context) => {
	const { admission } = context.args as AdminFeedbackBannerArgs;

	// `MarketSessionStore` reads `/api/market` through the global `fetch`.
	window.fetch = (input, init) =>
		String(input instanceof Request ? input.url : input) === '/api/market'
			? Promise.resolve(Response.json({ event: null, questions: [], counts: {} }))
			: originalFetch(input, init);

	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (input: string, init?: RequestInit) =>
			Promise.resolve(adminResponse(input, init));
		const created = new RootStore({
			admin: { api: new AdminApi({ request: request as typeof fetch }) },
		});

		void created.admin.addGuest({ ...guest, admission }, { locale: 'en' });

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<Story />
		</RootStoreProvider>
	);
};

/** The banner reads everything from the store; `admission` is read by `withAddedGuest`. */
function Fixture(_: AdminFeedbackBannerArgs) {
	return <AdminFeedbackBanner />;
}

const meta = {
	title: 'Admin/AdminFeedbackBanner',
	component: Fixture,
	parameters: { shell: 'admin' },
	decorators: [withAddedGuest],
	args: { admission: 'queue' },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A walk-in just added: the worker can hand the record straight to the guest's phone. */
export const GuestAdded: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(await canvas.findByRole('status')).toHaveTextContent('Ada Lovelace was added.');
		await userEvent.click(canvas.getByRole('button', { name: t.guestClaimShow }));
		// The dialog renders in a portal outside the story's canvas.
		await expect(await screen.findByRole('img', { name: t.guestClaimImageAlt })).toBeVisible();
		await userEvent.click(screen.getByRole('button', { name: t.guestClaimDone }));
		await expect(screen.queryByRole('img', { name: t.guestClaimImageAlt })).not.toBeInTheDocument();
	},
};

/** A record of someone served after the fact: they are not at the table, so no QR code. */
export const RecordedAsServed: Story = {
	args: { admission: 'served' },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('status')).toHaveTextContent('Ada Lovelace was added.');
		await expect(canvas.queryByRole('button', { name: t.guestClaimShow })).not.toBeInTheDocument();
	},
};
