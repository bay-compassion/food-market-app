import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { QueueDeskProvider } from '../components/queue/queue-desk-context';
import { TicketNameTag } from '../components/queue/TicketNameTag';
import type { QueueGuest } from '../services/admin-api';
import type { QueueDeskStore } from '../stores/queue-desk.store';

const t = adminTranslations.en.queueDesk;

const guest: QueueGuest = {
	id: 'visit-1',
	guestId: 'guest-1',
	firstName: 'Maria',
	lastName: 'Santos',
	phone: '5105550123',
	householdSize: 4,
	locale: 'es',
	queuePosition: 14,
	calledAt: null,
	status: 'called',
};

afterEach(() => {
	vi.restoreAllMocks();
});

/** Renders the tag against a desk that only answers what the print button reads. */
function renderTag({ stationOnline = false } = {}) {
	const desk = {
		printStationOnline: stationOnline,
		isSendingNameTag: () => false,
		sendNameTag: vi.fn(),
	};

	render(
		<QueueDeskProvider value={desk as unknown as QueueDeskStore}>
			<TicketNameTag guest={guest} />
		</QueueDeskProvider>,
	);

	return desk;
}

describe('TicketNameTag', () => {
	it('sends the tag to the print station when one is online', async () => {
		// Arrange
		const user = userEvent.setup();
		const desk = renderTag({ stationOnline: true });

		// Act
		await user.click(screen.getByRole('button', { name: t.printNameTag }));

		// Assert
		expect(desk.sendNameTag).toHaveBeenCalledWith(guest);
		expect(screen.getByText(t.printsAtStation)).toBeTruthy();
	});

	it('disables printing, and says why, when no print station is online', () => {
		// Arrange
		renderTag();

		// Act
		const button = screen.getByRole<HTMLButtonElement>('button', { name: t.printNameTag });

		// Assert
		expect(button.disabled).toBe(true);
		expect(button.getAttribute('aria-describedby')).toBe(
			screen.getByText(t.printStationIsOffline).id,
		);
	});

	it('never opens the phone’s own print dialog, which can’t reach the label printer', async () => {
		// Arrange
		const user = userEvent.setup();
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});

		renderTag({ stationOnline: true });

		// Act
		await user.click(screen.getByRole('button', { name: t.printNameTag }));

		// Assert
		expect(print).not.toHaveBeenCalled();
		expect(document.body.querySelector(':scope > .name-tag-print')).toBeNull();
	});
});
