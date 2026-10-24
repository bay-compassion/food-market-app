import { Auth0Context, initialContext } from '@auth0/auth0-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

import { authReturnUrl } from '../../../auth';
import { translations, type Locale } from '../../../locales';
import { AppBar } from './AppBar';

const logout = fn().mockResolvedValue(undefined);

const meta = {
	title: 'Primitives/App Bar',
	component: AppBar,
	parameters: { shell: 'bare' },
	decorators: [
		(Story, context) => (
			<Auth0Context.Provider
				value={{
					...initialContext,
					isLoading: false,
					isAuthenticated: Boolean(context.parameters.signedIn),
					user: context.parameters.signedIn
						? {
								name: 'Staff Member',
								email: 'staff@thebaycompassion.org',
								picture: context.parameters.picture as string | undefined,
							}
						: undefined,
					logout,
				}}
			>
				<Story />
			</Auth0Context.Provider>
		),
	],
} satisfies Meta<typeof AppBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Guest: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale].appBar;
		const trigger = canvas.getByRole('button', { name: t.openMenu });

		await userEvent.click(trigger);
		const menu = within(await within(document.body).findByRole('menu'));

		await expect(menu.getByRole('menuitem', { name: t.website })).toHaveAttribute(
			'href',
			'https://thebaycompassion.org',
		);
		await expect(menu.getByRole('menuitem', { name: t.qrCode })).toHaveAttribute(
			'href',
			'/qr-code',
		);
		await expect(menu.getByRole('menuitem', { name: t.staffLogin })).toHaveAttribute(
			'href',
			'/admin',
		);
		await expect(menu.queryByRole('menuitem', { name: t.adminPanel })).not.toBeInTheDocument();
		await expect(menu.queryByRole('menuitem', { name: t.signOut })).not.toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await expect(trigger).toHaveFocus();
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	},
};

/**
 * Opened from the menu. Every device has its install ID to show; the guest token appears beside it
 * only once a guest has registered on the device, which this story does not arrange.
 */
export const DeviceDetails: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale].appBar;

		await userEvent.click(canvas.getByRole('button', { name: t.openMenu }));
		const menu = within(await within(document.body).findByRole('menu'));

		await userEvent.click(menu.getByRole('menuitem', { name: t.deviceDetails.title }));
		const dialog = within(await within(document.body).findByRole('dialog'));

		await expect(
			dialog.getByRole('region', { name: t.deviceDetails.installIdLabel }),
		).toBeVisible();
		await expect(dialog.getByRole('button', { name: t.deviceDetails.copyInstallId })).toBeVisible();
	},
};

/**
 * Opened from the menu. A choice applies at once, by writing `data-theme` on `<html>`; the story
 * picks Dark and then Light, leaving the page as it found it for the other stories beside it.
 */
export const Appearance: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale].appBar;

		await userEvent.click(canvas.getByRole('button', { name: t.openMenu }));
		const menu = within(await within(document.body).findByRole('menu'));

		await userEvent.click(menu.getByRole('menuitem', { name: t.colorMode.title }));
		const dialog = within(await within(document.body).findByRole('dialog'));

		await userEvent.click(dialog.getByRole('radio', { name: t.colorMode.dark }));
		await expect(dialog.getByRole('radio', { name: t.colorMode.dark })).toBeChecked();
		await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));

		await userEvent.click(dialog.getByRole('radio', { name: t.colorMode.light }));
		await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
	},
};

export const SignedIn: Story = {
	parameters: { signedIn: true, picture: '/bay-compassion-logo.png' },
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale].appBar;

		logout.mockClear();

		await userEvent.click(canvas.getByRole('button', { name: t.accountMenu }));
		const menu = within(await within(document.body).findByRole('menu'));

		// The signed-in account is named here rather than on the admin page it used to head.
		// Waited for because the menu is still fading in when it first enters the document.
		await waitFor(() => expect(menu.getByText('staff@thebaycompassion.org')).toBeVisible());

		// The dashboard link no longer offers a sign-in to someone already signed in.
		await expect(menu.getByRole('menuitem', { name: t.adminPanel })).toHaveAttribute(
			'href',
			'/admin',
		);
		await expect(menu.queryByRole('menuitem', { name: t.staffLogin })).not.toBeInTheDocument();
		await userEvent.click(menu.getByRole('menuitem', { name: t.signOut }));

		await expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: authReturnUrl } });
	},
};

export const SignedInWithoutPhoto: Story = {
	parameters: { signedIn: true },
};
