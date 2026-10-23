import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { KioskUnlockCode } from '../../services/kiosk-unlock';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { KioskUnlockDialog } from './KioskUnlockDialog';

type KioskUnlockDialogArgs = { expired: boolean };

const t = adminTranslations.en.kioskUnlock;

/** A store with the dialog already open, against an API that issues one fixed code. */
function SeededDialog({ expired }: KioskUnlockDialogArgs) {
	const [store] = useState(() => {
		const code: KioskUnlockCode = {
			code: '482913',
			expiresAt: new Date(Date.now() + (expired ? -60_000 : 8 * 60_000)).toISOString(),
		};
		// `AdminApi` only ever requests a plain path string.
		const request = () => Promise.resolve(Response.json(code));
		const created = new RootStore({
			admin: { api: new AdminApi({ request: request as typeof fetch }) },
		});

		void created.admin.showKioskUnlockCode();

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<KioskUnlockDialog />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: KioskUnlockDialogArgs) {
	return <SeededDialog key={String(args.expired)} {...args} />;
}

/**
 * The room display's address and the six digits a worker types into it, from "Unlock a room
 * display" in the menu on `/queue` or the dashboard's Queue tab. One code unlocks any number of
 * displays for five to ten minutes; no worker ever signs in on the display itself.
 */
const meta = {
	title: 'Staff/Queue Desk/Room Display Code',
	component: Fixture,
	parameters: { shell: 'admin' },
	args: { expired: false },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Where the display goes, a fresh code, and until when it works. */
export const Fresh: Story = {
	play: async () => {
		// The dialog renders in a portal outside the story's canvas.
		await expect(await screen.findByText('482913')).toBeVisible();
		await expect(screen.getByText(`${window.location.host}/kiosk`)).toBeVisible();
		await expect(screen.getByRole('dialog', { name: t.title })).toBeVisible();
	},
};

/** Left open past its time: struck through and labelled, so nobody types a dead code. */
export const Expired: Story = {
	args: { expired: true },
	play: async () => {
		await expect(await screen.findByText(t.expired)).toBeVisible();
		await expect(screen.getByText('482913')).toHaveAttribute('data-expired', 'true');
	},
};
