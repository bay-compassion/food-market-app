import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { printStationLaunchCommand } from '../print-station/PrintStationSetup';
import { PrintStationFixture, type StationState } from './printStation.fixture';
import { PrintStationCard } from './PrintStationCard';

type PrintStationCardArgs = { station: StationState };

const t = adminTranslations.en.printStationCard;

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: PrintStationCardArgs) {
	return (
		<PrintStationFixture key={args.station} station={args.station}>
			<PrintStationCard />
		</PrintStationFixture>
	);
}

/**
 * The check-in computer's printing station on the Checklist screen: whether it is checking in, which
 * account signs in, and how to start it on a market day.
 */
const meta = {
	title: 'Admin/Checklist/Printing Station',
	component: Fixture,
	parameters: { shell: 'admin' },
	argTypes: { station: { control: 'inline-radio', options: ['online', 'offline', 'unknown'] } },
	args: { station: 'online' },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The station is up: volunteers' phones can print. */
export const Online: Story = {
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole('status')).toHaveTextContent(t.online);
	},
};

/** A worker checks the label printer by sending it a sample tag. */
export const PrintTestTag: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('status')).toHaveTextContent(t.online);
		await userEvent.click(canvas.getByRole('button', { name: t.printTest }));
		await expect(await within(document.body).findByText(t.testSent)).toBeVisible();
	},
};

/** Nobody has the station's page open, so there is nothing to print a test tag on. */
export const Offline: Story = {
	args: { station: 'offline' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('status')).toHaveTextContent(t.offline);
		await expect(canvas.getByRole('button', { name: t.printTest })).toBeDisabled();
	},
};

/** A worker who can't ask whether the station is up sees the setup without a status. */
export const Unknown: Story = {
	args: { station: 'unknown' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('heading', { name: t.title })).toBeVisible();
		await expect(canvas.queryByRole('status')).toBeNull();
		await expect(canvas.queryByRole('button', { name: t.printTest })).toBeNull();
	},
};

/**
 * The market-day steps alone: the iMac's automation starts the station, so the Terminal command is
 * left to When You Need It.
 */
export const MarketDaySteps: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		for (const step of t.steps) {
			await expect(canvas.getByRole('checkbox', { name: step.title })).toBeInTheDocument();
		}
		await expect(canvas.queryByText(printStationLaunchCommand)).toBeNull();
	},
};
