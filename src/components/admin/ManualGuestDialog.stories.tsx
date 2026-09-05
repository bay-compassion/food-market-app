import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { admissionsFor } from '../../services/guestAdmission';
import { ManualGuestDialog } from './ManualGuestDialog';

/**
 * Adding a guest by hand.
 *
 * The identity and household fields are the guest-facing form components themselves, reading the
 * registration store the preview provides fresh per story. `admissions` is the interesting
 * control: it decides whether the worker is asked how to admit the guest at all, and which
 * follow-up question — draw odds or queue placement — comes with the answer.
 */
const meta = {
	title: 'Admin/ManualGuestDialog',
	component: ManualGuestDialog,
	parameters: { shell: 'admin' },
	args: {
		open: true,
		admissions: admissionsFor('registration_open'),
		busy: false,
		onSubmit: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof ManualGuestDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Before the lottery runs, a worker chooses between the draw and a reserved spot. */
export const BeforeTheLottery: Story = {};

/** Once service is under way there is one way in, so the question is only where in the line. */
export const DuringService: Story = {
	args: { admissions: admissionsFor('service_started') },
};

/** After a session has ended, only an after-the-fact record of someone served is possible. */
export const AfterTheSession: Story = {
	args: { admissions: admissionsFor('ended') },
};

/** Every control disabled while the save is in flight. */
export const Busy: Story = {
	args: { busy: true },
};
