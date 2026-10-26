import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueueDeskProvider } from '../components/queue/queue-desk-context';
import { TicketChip } from '../components/queue/TicketChip';
import type { QueueGuest } from '../services/admin-api';
import type { QueueDeskStore } from '../stores/queue-desk.store';

const guest: QueueGuest = {
	id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd7f3a',
	guestId: 'guest-1',
	firstName: 'Maria',
	lastName: 'Santos',
	pronunciation: null,
	staffNotes: null,
	phone: '5105550123',
	householdSize: 4,
	locale: 'es',
	queuePosition: 14,
	priorityNumber: null,
	queueFront: false,
	queueOrder: 14,
	calledAt: null,
	status: 'waiting',
};

describe('TicketChip', () => {
	it('shows the reference code the guest’s name tag carries, to check a sticker against', () => {
		// Arrange
		const desk = { selected: null, select: () => {} };

		// Act
		render(
			<QueueDeskProvider value={desk as unknown as QueueDeskStore}>
				<ul>
					<TicketChip guest={guest} now={Date.now()} />
				</ul>
			</QueueDeskProvider>,
		);

		// Assert
		expect(screen.getByText('7F3A')).toBeTruthy();
	});
});
