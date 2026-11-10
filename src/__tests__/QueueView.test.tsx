import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { QueueView } from '../components/admin/QueueView';
import {
	numberedQueue,
	seededQueueStore,
	type SeededQueueOptions,
} from '../components/queue/seeded-queue.fixture';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';

const t = adminTranslations.en;

function renderQueue(options: Partial<SeededQueueOptions> = {}) {
	const store = seededQueueStore({ guests: numberedQueue, ...options });
	const onNavigateCurrentSession = vi.fn();

	render(
		<RootStoreProvider store={store}>
			<QueueView onNavigateCurrentSession={onNavigateCurrentSession} />
		</RootStoreProvider>,
		// The actions menu links out to the standalone queue screen, which needs a router.
		{ wrapper: MemoryRouter },
	);

	return { store, onNavigateCurrentSession };
}

/** The ticket for the first called guest in the seeded line. */
function firstCalledTicket() {
	return screen.findAllByRole('button', { name: /^Open ticket / }).then(([first]) => first!);
}

describe('QueueView', () => {
	it('points back to the session before service starts', async () => {
		// Arrange
		const { onNavigateCurrentSession } = renderQueue({
			sessionStatus: SessionStatusEnum.REGISTRATION_CLOSED,
		});

		// Act
		await userEvent.click(await screen.findByRole('button', { name: t.goToCurrentSession }));

		// Assert
		expect(onNavigateCurrentSession).toHaveBeenCalledOnce();
		expect(screen.queryByRole('button', { name: /^Call next/ })).toBeNull();
	});

	it('says so once the session has ended', async () => {
		// Arrange
		renderQueue({ sessionStatus: SessionStatusEnum.ENDED });

		// Act
		const message = await screen.findByText(t.queueDesk.ended);

		// Assert
		expect(message).toBeTruthy();
	});

	it('runs the queue desk’s line, calling one guest at a time', async () => {
		// Arrange
		renderQueue();

		// Act
		const call = await screen.findByRole('button', { name: /^Call next/ });

		// Assert
		expect(call).toBeTruthy();
		expect(screen.getByRole('button', { name: t.queueDesk.openSearch })).toBeTruthy();
		// No count to call several at once: batch calling is not something the market permits.
		expect(screen.queryByRole('spinbutton')).toBeNull();
		// The dashboard names the screen, so the desk's own title stays off it.
		expect(screen.queryByRole('heading', { name: t.queueDesk.title })).toBeNull();
	});

	it('links out to the standalone queue screen from its actions', async () => {
		// Arrange
		renderQueue();
		await screen.findByRole('button', { name: /^Call next/ });

		// Act
		await userEvent.click(screen.getByRole('button', { name: t.queueDesk.actions }));

		// Assert
		const link = screen.getByRole('menuitem', { name: t.queueDesk.openQueueDesk });

		expect(link.getAttribute('href')).toBe('/queue');
	});

	it('offers a manager the code that puts the guest on a phone, on their ticket', async () => {
		// Arrange
		renderQueue({ permissions: ['run:queue', 'manage:guest-access'] });

		// Act
		await userEvent.click(await firstCalledTicket());

		// Assert
		const ticket = screen.getByRole('region', { name: t.queueDesk.ticket });

		expect(within(ticket).getByRole('button', { name: t.guestClaimShow })).toBeTruthy();
	});

	it('keeps that code from a volunteer who only runs the line', async () => {
		// Arrange
		renderQueue();

		// Act
		await userEvent.click(await firstCalledTicket());

		// Assert
		const ticket = screen.getByRole('region', { name: t.queueDesk.ticket });

		expect(within(ticket).queryByRole('button', { name: t.guestClaimShow })).toBeNull();
	});
});
