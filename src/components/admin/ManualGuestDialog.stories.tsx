import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { admissionsFor, manualAdmissionsFor } from '../../services/guestAdmission';
import { ManualGuestDialog } from './ManualGuestDialog';

const t = adminTranslations.en;

/**
 * Adding a guest by hand.
 *
 * The identity and household fields are the guest-facing form components themselves, reading the
 * registration store the preview provides fresh per story, with their wording that addresses the
 * guest swapped for the worker's. `admissions` is the interesting
 * control: it decides whether the worker is asked how to admit the guest at all, and which
 * follow-up question — draw odds or queue placement — comes with the answer.
 */
const meta = {
	title: 'Admin/Shared/Add Guest Dialog',
	component: ManualGuestDialog,
	parameters: { shell: 'admin' },
	args: {
		open: true,
		admissions: manualAdmissionsFor('registration_open'),
		busy: false,
		onSubmit: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof ManualGuestDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Before the lottery runs, a worker chooses between the draw and a reserved spot. */
export const BeforeTheLottery: Story = {
	play: async () => {
		const dialog = within(await within(document.body).findByRole('dialog'));

		// The worker is entering someone else's details, so the form speaks about the guest.
		await expect(
			dialog.getByRole('group', { name: t.manualGuestForm.informationLegend }),
		).toBeVisible();
		await expect(
			dialog.getByRole('group', { name: t.manualGuestForm.lotteryLegend }),
		).toBeVisible();
		await expect(dialog.getByText(t.manualGuestForm.pronunciationOffer)).toBeVisible();
	},
};

/** Once service is under way there is one way in, so the question is only where in the line. */
export const DuringService: Story = {
	args: { admissions: manualAdmissionsFor('service_started') },
};

/** After a session has ended, only an after-the-fact record of someone served is possible. */
export const AfterTheSession: Story = {
	args: { admissions: admissionsFor('ended') },
};

/** Between sessions: only the guest's details can be saved, so no household is asked for. */
export const BetweenSessions: Story = {
	args: { admissions: manualAdmissionsFor(null) },
};

/** Every control disabled while the save is in flight. */
export const Busy: Story = {
	args: { busy: true },
};
