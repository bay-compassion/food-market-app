import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Auth0 is only configured when the VITE_AUTH0_* variables are set, which is true locally but not
// in CI. Pretend it is, so the guard actually reaches `loginWithRedirect`.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	isAuth0Configured: true,
}));

const authClient = {
	isLoading: false,
	isAuthenticated: false,
	loginWithRedirect: vi.fn(),
};

vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => authClient }));

import { createMemoryRouter, RouterProvider } from 'react-router';

import { RequireAuth } from '../components/RequireAuth';

function renderAt(route: string) {
	const router = createMemoryRouter([{ path: '*', element: <RequireAuth>admin</RequireAuth> }], {
		initialEntries: [route],
	});

	return render(<RouterProvider router={router} />);
}

describe('RequireAuth', () => {
	beforeEach(() => {
		authClient.isAuthenticated = false;
		authClient.loginWithRedirect.mockClear();
	});

	it('records the screen being asked for, so the sign-in returns to it', async () => {
		// Arrange

		// Act
		renderAt('/admin/reports?range=week');

		// Assert
		await waitFor(() =>
			expect(authClient.loginWithRedirect).toHaveBeenCalledWith({
				appState: { returnTo: '/admin/reports?range=week' },
			}),
		);
	});

	it('leaves a signed-in worker where they are', async () => {
		// Arrange
		authClient.isAuthenticated = true;

		// Act
		const { container } = renderAt('/admin');

		// Assert
		await waitFor(() => expect(container.textContent).toBe('admin'));
		expect(authClient.loginWithRedirect).not.toHaveBeenCalled();
	});
});
