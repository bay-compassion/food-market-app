import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { HouseholdServiceEntry } from '../../services/household-service';
import {
	HouseholdServiceStore,
	type HouseholdServiceApi,
} from '../../stores/household-service.store';
import { HouseholdServiceForm } from './HouseholdServiceRecorder';

const t = adminTranslations.en.householdService;

function Recorder({ failFirst = false }: { failFirst?: boolean }) {
	const [store] = useState(() => {
		let entries: HouseholdServiceEntry[] = [];
		let fail = failFirst;
		const api: HouseholdServiceApi = {
			householdServiceEntries: async () => entries,
			recordHouseholdService: async (submission) => {
				let entry = entries.find((row) => row.id === submission.id);

				if (!entry) {
					entry = {
						...submission,
						version: 1,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						createdBy: 'worker',
						updatedBy: 'worker',
						voidedAt: null,
					};
					entries = [entry, ...entries];
				}

				if (fail) {
					fail = false;
					throw new Error('Response lost after save');
				}

				return entry;
			},
			correctHouseholdService: async (id, correction) => {
				const entry = entries.find((row) => row.id === id)!;
				const updated = {
					...entry,
					...correction,
					version: entry.version + 1,
					voidedAt: correction.voided ? new Date().toISOString() : null,
				};

				entries = entries.map((row) => (row.id === id ? updated : row));

				return updated;
			},
		};

		return new HouseholdServiceStore('story-event', api, null);
	});

	return <HouseholdServiceForm store={store} />;
}
const meta = {
	title: 'Admin/Session/Count-only Households',
	component: Recorder,
	parameters: { shell: 'admin' },
} satisfies Meta<typeof Recorder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecordCorrectAndUndo: Story = {
	play: async ({ canvas }) => {
		const size = canvas.getByRole('textbox', { name: t.size });

		await waitFor(() => expect(size).toBeEnabled());
		await userEvent.type(size, '4');
		await userEvent.click(canvas.getByRole('button', { name: t.record }));
		await expect(await canvas.findByText(t.saved)).toBeVisible();
		await expect(size).toHaveValue('');
		await expect(size).toHaveFocus();
		const list = canvas.getByRole('list', { name: t.entries });

		await expect(within(list).getAllByRole('listitem')).toHaveLength(1);
		await userEvent.click(within(list).getByRole('button', { name: t.correct }));
		const correction = within(list).getByRole('textbox', { name: t.size });

		await userEvent.clear(correction);
		await userEvent.type(correction, '6');
		await userEvent.click(within(list).getByRole('button', { name: t.saveCorrection }));
		await expect(await within(list).findByText(/6 people/)).toBeVisible();
		await userEvent.click(within(list).getByRole('button', { name: t.undo }));
		await expect(await within(list).findByText(/Undone/)).toBeVisible();
		await expect(canvas.getByText(t.total, { exact: false })).toHaveTextContent(
			'0 households, 0 people',
		);
		await userEvent.click(within(list).getByRole('button', { name: t.restore }));
		await expect(canvas.getByText(t.total, { exact: false })).toHaveTextContent(
			'1 households, 6 people',
		);
	},
};

export const RetryAnUncertainSave: Story = {
	args: { failFirst: true },
	play: async ({ canvas }) => {
		const size = canvas.getByRole('textbox', { name: t.size });

		await waitFor(() => expect(size).toBeEnabled());
		await userEvent.type(size, '3');
		await userEvent.click(canvas.getByRole('button', { name: t.record }));
		await expect(await canvas.findByText(t.errors.save)).toBeVisible();
		await expect(size).toBeDisabled();
		await userEvent.click(canvas.getByRole('button', { name: t.retrySave }));
		await expect(await canvas.findByText(t.saved)).toBeVisible();
		await expect(
			within(canvas.getByRole('list', { name: t.entries })).getAllByRole('listitem'),
		).toHaveLength(1);
	},
};
