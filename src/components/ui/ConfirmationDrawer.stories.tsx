import { Button } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import type { ConfirmationRequest } from '../../stores/confirmation.store';
import { useRootStore } from '../../stores/react/store-context';

/**
 * A host that asks the way a real caller does — awaiting the answer — and reports what came back,
 * so a story covers both buttons rather than one fixed open state.
 *
 * The sheet itself is mounted by the preview's shell decorator, exactly as `App` mounts it.
 */
const ConfirmationHost = observer(function ConfirmationHost(request: ConfirmationRequest) {
	const { confirmation } = useRootStore();
	const [answer, setAnswer] = useState<boolean | null>(null);

	async function ask() {
		setAnswer(await confirmation.ask(request));
	}

	return (
		<div style={{ display: 'grid', gap: 16, padding: 16, justifyItems: 'start' }}>
			<Button type="button" onClick={() => void ask()}>
				Ask for confirmation
			</Button>
			<p role="status">
				{answer === null ? 'Nothing asked yet' : answer ? 'Confirmed' : 'Dismissed'}
			</p>
		</div>
	);
});

/** Opens the sheet and returns queries scoped to it, since it renders in a portal. */
async function openSheet(
	canvas: ReturnType<typeof within>,
	userEvent: { click: (element: Element) => Promise<void> },
) {
	await userEvent.click(canvas.getByRole('button', { name: 'Ask for confirmation' }));

	return within(await within(document.body).findByRole('alertdialog'));
}

const meta = {
	title: 'Primitives/ConfirmationDrawer',
	component: ConfirmationHost,
	tags: ['autodocs'],
	parameters: { shell: 'bare' },
	args: {
		question: 'Postpone this scheduled registration?',
		confirmLabel: 'Continue',
		dismissLabel: 'Cancel',
	},
} satisfies Meta<typeof ConfirmationHost>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A step worth pausing over, but one that takes nothing away. */
export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		const sheet = await openSheet(canvas, userEvent);

		await userEvent.click(sheet.getByRole('button', { name: 'Continue' }));
		await expect(canvas.getByRole('status')).toHaveTextContent('Confirmed');
	},
};

/** The confirming button turns red for an action that takes something away. */
export const Destructive: Story = {
	args: {
		question: 'Cancel your place in the queue for this visit?',
		confirmLabel: 'Yes, cancel my visit',
		dismissLabel: 'Keep my place',
		destructive: true,
	},
	play: async ({ canvas, userEvent }) => {
		const sheet = await openSheet(canvas, userEvent);

		await userEvent.click(sheet.getByRole('button', { name: 'Yes, cancel my visit' }));
		await expect(canvas.getByRole('status')).toHaveTextContent('Confirmed');
	},
};

/** Consequences the question itself cannot carry, spelled out underneath it. */
export const WithDetails: Story = {
	args: {
		question: 'Close this session and end service?',
		details: ['4 guests have not been served yet. Closing marks them as a no show.'],
		destructive: true,
	},
	play: async ({ canvas, userEvent }) => {
		const sheet = await openSheet(canvas, userEvent);

		await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }));
		await expect(canvas.getByRole('status')).toHaveTextContent('Dismissed');
	},
};
