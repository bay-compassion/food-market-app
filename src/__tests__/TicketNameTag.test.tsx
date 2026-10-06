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
	it('opens the phone’s print dialog when no print station is online', async () => {
		// Arrange
		const user = userEvent.setup();
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});

		renderTag();

		// Act
		await user.click(screen.getByRole('button', { name: t.printNameTag }));

		// Assert
		expect(print).toHaveBeenCalledOnce();
		expect(screen.getByText(t.printsFromPhone)).toBeTruthy();
	});

	it('sends the tag to the print station, with no dialog, when one is online', async () => {
		// Arrange
		const user = userEvent.setup();
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});
		const desk = renderTag({ stationOnline: true });

		// Act
		await user.click(screen.getByRole('button', { name: t.printNameTag }));

		// Assert
		expect(desk.sendNameTag).toHaveBeenCalledWith(guest);
		expect(print).not.toHaveBeenCalled();
		expect(screen.getByText(t.printsAtStation)).toBeTruthy();
	});

	it('keeps a label-sized copy directly in the page body for the print rules to show', () => {
		// Arrange
		renderTag();

		// Act
		const label = document.body.querySelector(':scope > .name-tag-print .name-tag');

		// Assert
		expect(label?.getAttribute('data-printed')).toBe('true');
		expect(label?.textContent).toContain('Maria S.');
		expect(label?.textContent).toContain('#14');
	});
});
