import type { Meta, StoryObj } from '@storybook/react-vite';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { translations } from '../../locales';
import type { PremarketCodeStatus } from '../../services/premarket';
import { PremarketEntryStore } from '../../stores/premarket-entry.store';
import { useRootStore } from '../../stores/react/store-context';
import { PremarketForm } from './PremarketForm';
import { PremarketStatusMessage } from './PremarketStatusMessage';

/**
 * Where a volunteer's scan of the printed premarket QR lands. The route (`PremarketPage`) only reads
 * the code out of the URL fragment and asks the server about it; these are what the volunteer sees.
 * A story hands the entry store its answer directly rather than faking `fetch`, which a docs page
 * would share between every story on it.
 */
type Args = { status: PremarketCodeStatus | 'checking' | 'missing' };

const copy = translations.en.premarket;

const Premarket = observer(function Premarket({ status }: Args) {
	const { guest, registration, visit } = useRootStore();
	const [entry] = useState(() => {
		const created = new PremarketEntryStore({
			code: status === 'missing' ? null : 'story-premarket-code-1234',
			registration,
			visit,
			guest,
			checkStatus: (): Promise<PremarketCodeStatus> =>
				status === 'checking' || status === 'missing'
					? new Promise(() => undefined)
					: Promise.resolve(status),
		});

		void created.check();

		return created;
	});

	return entry.state === 'open' ? (
		<PremarketForm entry={entry} />
	) : entry.state === 'registered' ? null : (
		<PremarketStatusMessage state={entry.state} onRetry={() => void entry.check()} />
	);
});

const meta = {
	title: 'Guest/Other Pages/Premarket',
	component: Premarket,
	parameters: { shell: 'guest' },
	args: { status: 'open' },
	argTypes: {
		status: {
			control: 'select',
			options: ['open', 'checking', 'closed', 'invalid', 'missing', 'unreachable'],
		},
	},
} satisfies Meta<typeof Premarket>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CheckIn: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('heading', { name: copy.title })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.submit })).toBeInTheDocument();
		await expect(canvas.getByText(copy.householdLegend)).toBeInTheDocument();
	},
};

export const Checking: Story = {
	args: { status: 'checking' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole('status')).toHaveTextContent(copy.checking);
	},
};

export const NotOpen: Story = {
	args: { status: 'closed' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.closedHeading)).toBeInTheDocument();
	},
};

export const ReplacedCode: Story = {
	args: { status: 'invalid' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.invalidDetails)).toBeInTheDocument();
	},
};

export const MissingCode: Story = {
	args: { status: 'missing' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.missingDetails)).toBeInTheDocument();
	},
};

export const Unreachable: Story = {
	args: { status: 'unreachable' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText(copy.unreachableHeading)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.retry })).toBeInTheDocument();
	},
};
