import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The permissions the signed-in worker's token carries. */
const tokenPermissions = { current: ['manage:sessions'] as string[] };

// Pretend Auth0 is configured, as in `App.test.tsx`, so the route's gate consults the client below.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	auth0Settings: null,
	isAuth0Configured: true,
	permissionsFromToken: () => tokenPermissions.current,
}));

const authClient = {
	isLoading: false,
	isAuthenticated: false,
	loginWithRedirect: vi.fn(),
	getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
};

vi.mock('@auth0/auth0-react', () => ({
	useAuth0: () => authClient,
}));

import { adminTranslations } from '../adminLocales';
import { PremarketPosterRoute } from '../components/admin/PremarketPosterRoute';
import { translations } from '../locales';
import { premarketPosterPath } from '../services/premarket';
import { renderWithApp } from './render-with-app';

const t = adminTranslations.en.today;

function renderPoster() {
	return renderWithApp(<PremarketPosterRoute />, {
		route: premarketPosterPath,
		routes: [{ path: '/admin/:view?', element: <div>dashboard</div> }],
	});
}

describe('PremarketPosterRoute', () => {
	beforeEach(() => {
		authClient.isAuthenticated = false;
		authClient.loginWithRedirect.mockReset();
		tokenPermissions.current = ['manage:sessions'];
	});

	it('sends a signed-out visitor to sign in without showing the code', () => {
		// Act
		const { container } = renderPoster();

		// Assert
		expect(authClient.loginWithRedirect).toHaveBeenCalledWith({
			appState: { returnTo: premarketPosterPath },
		});
		expect(screen.getByRole('alert').textContent).toBe(translations.en.authError);
		expect(container.querySelector('.qr-code')).toBeNull();
	});

	it('shows a signed-in admin the premarket code and its address', async () => {
		// Arrange
		authClient.isAuthenticated = true;

		// Act
		const { container } = renderPoster();

		// Assert
		expect(await screen.findByRole('heading', { name: t.premarketPosterTitle })).toBeTruthy();
		expect(screen.getByRole('img', { name: t.premarketCode }).innerHTML).toContain('<svg');
		expect(container.querySelector('.qr-url')!.textContent).toBe(
			`${window.location.origin}/premarket`,
		);
	});

	it('goes back to the Today screen', async () => {
		// Arrange
		authClient.isAuthenticated = true;
		const user = userEvent.setup();
		const { currentPath } = renderPoster();

		// Act
		await user.click(await screen.findByRole('button', { name: t.backToToday }));

		// Assert
		expect(currentPath()).toBe('/admin/current-session');
	});

	it('tells a worker who isn’t an admin that only admins can print it', async () => {
		// Arrange
		authClient.isAuthenticated = true;
		tokenPermissions.current = ['run:queue'];

		// Act
		const { container } = renderPoster();

		// Assert
		expect((await screen.findByRole('alert')).textContent).toBe(
			adminTranslations.en.qrPosters.notPermitted,
		);
		expect(container.querySelector('.qr-code')).toBeNull();
	});
});
