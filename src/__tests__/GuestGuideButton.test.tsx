import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GuestNotOpenState } from '../components/guest-view/GuestNotOpenState';
import { GuestGuideButton } from '../components/GuestGuideButton';
import { HoldingPage } from '../components/holding-page/HoldingPage';
import { translations } from '../locales';
import { renderWithApp } from './render-with-app';

describe('Guest guide playback', () => {
	for (const [placement, Component, label] of [
		['holding page', HoldingPage, 'watch'],
		['market closed card', GuestNotOpenState, 'watchShort'],
	] as const) {
		it(`opens only the standalone player from the ${placement} and removes it on close`, async () => {
			const user = userEvent.setup();
			const copy = translations.en.guestView.presentation;
			const { currentPath } = renderWithApp(<Component />);

			// The large narrated presentation must not load until the guest asks for it.
			expect(screen.queryByTitle(copy.title)).toBeNull();
			await user.click(screen.getByRole('button', { name: copy[label] }));

			const player = screen.getByTitle<HTMLIFrameElement>(copy.title);

			expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(
				screen.getByRole('heading', { name: copy.title }).id,
			);
			expect(player.src).toBe(
				'https://bay-compassion.github.io/food-market-app/presentations/guest-guide/guest-guide.html',
			);
			// Playback needs scripts and the illustrated phone's srcdoc frame, but must not open
			// new tabs or navigate the guest out of the app.
			expect(player.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
			expect(player.getAttribute('allow')).toBe('fullscreen');
			expect(currentPath()).toBe('/');

			await user.click(screen.getByRole('button', { name: copy.close }));
			expect(screen.queryByTitle(copy.title)).toBeNull();
			expect(document.activeElement).toBe(screen.getByRole('button', { name: copy[label] }));
		});
	}

	it('localizes the trigger, player title and close action', async () => {
		const user = userEvent.setup();
		const { store } = renderWithApp(<GuestGuideButton />);

		store.translations.setLanguage('ar');
		const copy = translations.ar.guestView.presentation;

		await user.click(await screen.findByRole('button', { name: copy.watch }));
		expect(screen.getByTitle(copy.title)).toBeDefined();
		await user.click(screen.getByRole('button', { name: copy.close }));
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
