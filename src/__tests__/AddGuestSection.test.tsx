import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { AddGuestSection } from '../components/admin/AddGuestSection';
import type { GuestAdmission } from '../services/guestAdmission';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const t = adminTranslations.en;

function renderSection(admissions: GuestAdmission[]) {
	const onAddGuest = vi.fn();
	const result = render(
		<RootStoreProvider store={new RootStore()}>
			<AddGuestSection admissions={admissions} busy={false} onAddGuest={onAddGuest} />
		</RootStoreProvider>,
	);

	return { ...result, onAddGuest };
}

async function openForm(admissions: GuestAdmission[]) {
	const user = userEvent.setup();
	const rendered = renderSection(admissions);

	await user.click(rendered.container.querySelector('.add-guest-button')!);

	return { ...rendered, user };
}

/** The dialog renders in a portal, so its controls are found from the document, not the section. */
function dialog() {
	return screen.getByRole('dialog');
}

function selects() {
	return Array.from(dialog().querySelectorAll('select'));
}

function form() {
	return dialog().querySelector('form')!;
}

function optionTexts(select: HTMLSelectElement) {
	return Array.from(select.options).map((option) => option.textContent);
}

describe('AddGuestSection', () => {
	it('renders nothing when the session cannot accept a guest', () => {
		const { container } = renderSection([]);

		expect(container.querySelector('.add-guest-button')).toBeNull();
		expect(container.textContent).toBe('');
	});

	it('lets a worker choose the draw or a reserved spot before the lottery runs', async () => {
		await openForm(['lottery', 'queue']);
		// [0] is the age range select, which is always present.
		const options = optionTexts(selects()[1]!);

		expect(options).toEqual([t.admitToLottery, t.admitToQueue]);
		// The first option leads, so the fair choice is what a worker gets by default.
		expect(dialog().textContent).toContain(t.admitToLotteryHelp);
	});

	it('drops the choice when the session only allows one way in', async () => {
		await openForm(['queue']);
		const found = selects();

		// The age range select, plus just the queue placement — no point asking a question with a
		// single answer.
		expect(found).toHaveLength(2);
		expect(optionTexts(found[1]!)).toEqual([t.placeEnd, t.placeNext]);
		expect(dialog().textContent).toContain(t.admitToQueueHelp);
	});

	it('hides the queue placement for an admission that never joins a line', async () => {
		await openForm(['served']);

		// Only the age range select remains.
		expect(selects()).toHaveLength(1);
		expect(dialog().textContent).toContain(t.admitAsServedHelp);
	});

	it('offers the draw odds only to a guest actually entering the draw', async () => {
		const { user } = await openForm(['lottery', 'queue']);

		expect(dialog().textContent).toContain(t.lotteryWeightLabel);
		// Switching to a reserved spot takes the guest out of the draw, so the odds go with it.
		await user.selectOptions(selects()[1]!, 'queue');
		expect(dialog().textContent).not.toContain(t.lotteryWeightLabel);
	});

	// The form is submitted directly rather than by clicking through it: these tests are about
	// which admission and weight the worker chose, and filling in every required identity field
	// first would say nothing extra while making each one three times as long.
	it('starts a weighted guest on even odds', async () => {
		const { onAddGuest } = await openForm(['lottery']);

		fireEvent.submit(form());

		expect(onAddGuest.mock.calls[0]?.[0]).toMatchObject({
			admission: 'lottery',
			lotteryWeightTier: 'standard',
		});
	});

	it('emits the weight tier the worker picked', async () => {
		const { onAddGuest, user } = await openForm(['lottery']);

		// [0] is the age range select; the admission select is hidden with a single admission, so
		// [1] is the lottery weight tier.
		await user.selectOptions(selects()[1]!, 'highest');
		fireEvent.submit(form());

		expect(onAddGuest.mock.calls[0]?.[0]).toMatchObject({ lotteryWeightTier: 'highest' });
	});

	it('emits the guest with the admission the worker picked', async () => {
		const { onAddGuest, user } = await openForm(['lottery', 'queue']);

		await user.selectOptions(selects()[1]!, 'queue');
		fireEvent.submit(form());

		expect(onAddGuest.mock.calls[0]?.[0]).toMatchObject({
			admission: 'queue',
			queuePlacement: 'end',
		});
	});

	it('closes the dialog once the guest has been handed to the container', async () => {
		const { container } = await openForm(['queue']);

		fireEvent.submit(form());

		// The dialog leaves through its transition, so it is gone a tick later rather than at once.
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(container.querySelector('.add-guest-button')).not.toBeNull();
	});

	it('opens with empty fields even when this device remembers a guest', async () => {
		const user = userEvent.setup();
		const store = new RootStore();

		store.registration.updateGuest({ firstName: 'Ada', householdSize: 4 });
		const { container } = render(
			<RootStoreProvider store={store}>
				<AddGuestSection admissions={['queue']} busy={false} onAddGuest={vi.fn()} />
			</RootStoreProvider>,
		);

		await user.click(container.querySelector('.add-guest-button')!);

		expect(store.registration.guest.firstName).toBe('');
		expect(store.registration.guest.householdSize).toBe('');
	});
});
