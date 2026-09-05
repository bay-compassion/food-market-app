import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { QueueView } from '../components/admin/QueueView';
import type { QueueGuest } from '../components/admin/types';
import type { VisitStatus } from '../services/visitStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const statusLabels = {
	waiting: 'Waiting',
	called: 'Called',
	served: 'Served',
	registered: 'Registered',
	not_placed: 'Not placed',
	no_show: 'No show',
	cancelled: 'Cancelled',
} satisfies Record<VisitStatus, string>;

function guest(overrides: Partial<QueueGuest> & { id: string }): QueueGuest {
	return {
		firstName: 'Ari',
		lastName: 'Guest',
		phone: '555-0100',
		householdSize: 2,
		locale: 'en',
		queuePosition: null,
		calledAt: null,
		status: 'waiting',
		...overrides,
	};
}

function renderQueue(guests: QueueGuest[], serviceStarted = true) {
	const onCallNext = vi.fn();
	const onCloseSession = vi.fn();
	const result = render(
		<RootStoreProvider store={new RootStore()}>
			<QueueView
				guests={guests}
				counts={{ waiting: 2, called: 1, served: 4 }}
				statusLabels={statusLabels}
				serviceStarted={serviceStarted}
				admissions={['queue']}
				busy={false}
				onCallNext={onCallNext}
				onRun={vi.fn()}
				onAddGuest={vi.fn()}
				onCloseSession={onCloseSession}
				onNavigateCurrentSession={vi.fn()}
			/>
		</RootStoreProvider>,
	);

	return { ...result, onCallNext, onCloseSession };
}

describe('QueueView', () => {
	it('explains that the queue is not open before service starts', () => {
		const { container } = renderQueue([], false);

		expect(container.textContent).toContain(adminTranslations.en.queueNotStarted);
		expect(container.textContent).not.toContain(adminTranslations.en.callNext);
	});

	it('puts the counts summary and call control above the guest lists', () => {
		const { container } = renderQueue([guest({ id: 'a', queuePosition: 1 })]);
		const text = container.textContent!;

		// The whole point of the view: a worker on a phone sees these without scrolling.
		expect(text).toContain('2 Waiting · 1 At the table · 4 Served');
		expect(text.indexOf(adminTranslations.en.callNext)).toBeLessThan(text.indexOf('Ari Guest'));
	});

	it('separates called guests from waiting guests, longest-called first', () => {
		const { container } = renderQueue([
			guest({ id: 'a', status: 'waiting', queuePosition: 3 }),
			guest({
				id: 'b',
				firstName: 'Bo',
				status: 'called',
				calledAt: '2026-08-08T18:10:00.000Z',
			}),
			guest({
				id: 'c',
				firstName: 'Cass',
				status: 'called',
				calledAt: '2026-08-08T18:02:00.000Z',
			}),
		]);
		const called = Array.from(container.querySelectorAll('.queue-guest-row'))
			.slice(0, 2)
			.map((row) => row.textContent);

		expect(called[0]).toContain('Cass');
		expect(called[1]).toContain('Bo');
	});

	it('shows how long a called guest has been waiting', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-08T18:12:00.000Z'));

		const { container } = renderQueue([
			guest({
				id: 'b',
				status: 'called',
				calledAt: '2026-08-08T18:00:00.000Z',
			}),
		]);

		expect(container.querySelector('.waiting-time')!.textContent).toBe('12 min');
		vi.useRealTimers();
	});

	it('lists finished guests with their status, and folds the list away on request', async () => {
		const user = userEvent.setup();
		const { container } = renderQueue([
			guest({ id: 'd', firstName: 'Dee', status: 'served' }),
			guest({ id: 'e', firstName: 'Eli', status: 'no_show' }),
		]);

		expect(container.textContent).toContain('Dee');
		expect(container.textContent).toContain('No show');

		await user.click(screen.getByRole('button', { name: /finished/i, expanded: true }));

		expect(container.textContent).not.toContain('Dee');
		expect(container.textContent).not.toContain('Eli');
	});

	it('closes the session from the header menu', async () => {
		const user = userEvent.setup();
		const { onCloseSession } = renderQueue([]);

		await user.click(screen.getByRole('button', { name: adminTranslations.en.sessionActions }));
		await user.click(screen.getByRole('menuitem', { name: adminTranslations.en.closeSession }));

		expect(onCloseSession).toHaveBeenCalledOnce();
	});

	it('opens the manual guest form from the waiting heading', async () => {
		const user = userEvent.setup();

		renderQueue([]);

		expect(screen.queryByRole('dialog')).toBeNull();

		await user.click(screen.getByRole('button', { name: /add guest/i }));

		expect(screen.getByRole('dialog').textContent).toContain(adminTranslations.en.manualGuestTitle);
	});

	it('asks the parent to call the chosen number of guests', async () => {
		const user = userEvent.setup();
		const { container, onCallNext } = renderQueue([guest({ id: 'a', queuePosition: 1 })]);
		const input = container.querySelector<HTMLInputElement>('.call-next input')!;

		await user.clear(input);
		await user.type(input, '3');
		fireEvent.submit(container.querySelector('.call-next')!);

		expect(onCallNext.mock.calls).toEqual([[3]]);
	});

	it('cannot call anyone when nobody is waiting', () => {
		const { container } = renderQueue([guest({ id: 'b', status: 'called' })]);

		expect(container.querySelector<HTMLButtonElement>('.call-next button')!.disabled).toBe(true);
	});

	it('only offers the transitions that are legal from each status', async () => {
		const user = userEvent.setup();
		const { container } = renderQueue([
			guest({
				id: 'b',
				status: 'called',
				calledAt: '2026-08-08T18:00:00.000Z',
			}),
		]);
		const actions = container.querySelector('.queue-guest-row .visit-commands')!;

		// The likely next step is the one visible button; the rest wait behind the menu.
		expect(actions.querySelector('.primary-command')!.textContent).toBe('Served');
		await user.click(actions.querySelector('.more-actions')!);
		const menu = screen.getByRole('menu').textContent!;

		expect(menu).toContain('Mark no show');
		expect(menu).toContain('Return to queue');
		// Calling an already-called guest is not a legal transition.
		expect(menu).not.toContain('Call');
	});

	it('runs a command chosen from the menu', async () => {
		const user = userEvent.setup();
		const onRun = vi.fn();

		render(
			<RootStoreProvider store={new RootStore()}>
				<QueueView
					guests={[guest({ id: 'a', queuePosition: 1 })]}
					counts={{}}
					statusLabels={statusLabels}
					serviceStarted
					admissions={[]}
					onCallNext={vi.fn()}
					onRun={onRun}
					onAddGuest={vi.fn()}
					onCloseSession={vi.fn()}
					onNavigateCurrentSession={vi.fn()}
				/>
			</RootStoreProvider>,
		);

		await user.click(screen.getByRole('button', { name: /more actions/i }));
		await user.click(screen.getByRole('menuitem', { name: 'Mark no show' }));

		expect(onRun.mock.calls).toEqual([[expect.objectContaining({ id: 'a' }), 'mark_no_show']]);
	});

	it('steps the call count with the stepper buttons, never below one', async () => {
		const user = userEvent.setup();
		const { container, onCallNext } = renderQueue([guest({ id: 'a', queuePosition: 1 })]);

		await user.click(screen.getByRole('button', { name: /one more/i }));
		await user.click(screen.getByRole('button', { name: /one more/i }));
		await user.click(screen.getByRole('button', { name: /one fewer/i }));
		fireEvent.submit(container.querySelector('.call-next')!);

		expect(onCallNext.mock.calls).toEqual([[2]]);
		expect(
			screen.getByRole<HTMLButtonElement>('button', {
				name: /one fewer/i,
			}).disabled,
		).toBe(false);
	});
});
