import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { QrCodeView } from '../components/QrCodeView';
import { translations } from '../locales';
import { renderWithApp } from './render-with-app';

/**
 * `/qr-code` is the poster a market prints and puts on a table, so it is the one screen nobody
 * opens while developing. It once shipped with every label undefined — it had been rendered by
 * `App` with props, was promoted to a route component of its own, and the props were not
 * replaced. These tests are what would have caught that.
 */
function renderQrCodeView() {
	return renderWithApp(<QrCodeView />, {
		route: '/qr-code',
		routes: [{ path: '/', element: <div>guest</div> }],
	});
}

describe('QrCodeView', () => {
	it('renders every one of its labels', () => {
		// Arrange
		const t = translations.en;

		// Act
		const { container } = renderQrCodeView();

		// Assert
		expect(container.textContent).toContain(t.qrCodeTitle);
		expect(container.textContent).toContain(t.qrCodeDescription);
		expect(container.textContent).toContain(t.backToGuest);
		expect(container.textContent).toContain(t.qrCodePrint);
		expect(container.querySelector('.qr-code')!.getAttribute('aria-label')).toBe(t.qrCodeImageAlt);
	});

	it('renders a scannable QR code for the guest route', () => {
		// Act
		const { container } = renderQrCodeView();

		// Assert
		expect(container.querySelector('.qr-code')!.innerHTML).toContain('<svg');
		expect(container.querySelector('.qr-url')!.textContent).toBe(`${window.location.origin}/`);
	});

	it('goes back to the guest screen', async () => {
		// Arrange
		const user = userEvent.setup();
		const { currentPath } = renderQrCodeView();

		// Act
		await user.click(screen.getByRole('button', { name: translations.en.backToGuest }));

		// Assert
		expect(currentPath()).toBe('/');
	});
});
