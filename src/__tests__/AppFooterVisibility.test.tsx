import { describe, expect, it } from 'vitest';

import { App } from '../App';
import { renderWithApp } from './render-with-app';

describe('the app shell’s footer', () => {
	it.each(['/', '/help', '/privacy', '/terms', '/qr-code', '/administrators'])(
		'stays on the guest route %s',
		(route) => {
			// Arrange and act
			const { container } = renderWithApp(<App />, { route });

			// Assert
			expect(container.querySelector('footer.app-footer')).not.toBeNull();
		},
	);

	it.each(['/admin', '/admin/queue'])('leaves the dashboard route %s', (route) => {
		// Arrange and act
		const { container } = renderWithApp(<App />, { route });

		// Assert
		expect(container.querySelector('footer.app-footer')).toBeNull();
	});
});
