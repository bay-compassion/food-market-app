import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { TicketNameTag } from '../components/queue/TicketNameTag';
import type { QueueGuest } from '../services/admin-api';

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

describe('TicketNameTag', () => {
	it('opens the print dialog when asked to print the name tag', async () => {
		// Arrange
		const user = userEvent.setup();
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});

		render(<TicketNameTag guest={guest} />);

		// Act
		await user.click(screen.getByRole('button', { name: t.printNameTag }));

		// Assert
		expect(print).toHaveBeenCalledOnce();
	});

	it('keeps a label-sized copy directly in the page body for the print rules to show', () => {
		// Arrange
		render(<TicketNameTag guest={guest} />);

		// Act
		const label = document.body.querySelector(':scope > .name-tag-print .name-tag');

		// Assert
		expect(label?.getAttribute('data-printed')).toBe('true');
		expect(label?.textContent).toContain('Maria S.');
		expect(label?.textContent).toContain('#14');
	});
});
