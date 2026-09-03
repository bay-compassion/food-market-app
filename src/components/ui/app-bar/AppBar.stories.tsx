import { Auth0Context, initialContext } from '@auth0/auth0-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { authReturnUrl } from '../../../auth';
import { translations, type Locale } from '../../../locales';
import { AppBar } from './AppBar';

const logout = fn().mockResolvedValue(undefined);

const meta = {
	title: 'Primitives/AppBar',
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
						? { name: 'Staff Member', picture: context.parameters.picture as string | undefined }
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
		await expect(menu.getByRole('menuitem', { name: t.staffLogin })).toHaveAttribute(
			'href',
			'/admin',
		);
		await expect(menu.queryByRole('menuitem', { name: t.signOut })).not.toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await expect(trigger).toHaveFocus();
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	},
};

export const SignedIn: Story = {
	parameters: { signedIn: true, picture: '/bay-compassion-logo.png' },
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale].appBar;

		logout.mockClear();

		await userEvent.click(canvas.getByRole('button', { name: t.accountMenu }));
		await userEvent.click(
			within(await within(document.body).findByRole('menu')).getByRole('menuitem', {
				name: t.signOut,
			}),
		);

		await expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: authReturnUrl } });
	},
};

export const SignedInWithoutPhoto: Story = {
	parameters: { signedIn: true },
};
