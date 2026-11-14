import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { PrintStationFixture, type StationState } from './printStation.fixture';
import { TodayPrintStation } from './TodayPrintStation';

type TodayPrintStationArgs = { station: StationState };

const t = adminTranslations.en;

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture({ station }: TodayPrintStationArgs) {
	return (
		<PrintStationFixture key={station} station={station}>
			<TodayPrintStation />
		</PrintStationFixture>
	);
}

/**
 * The print station on the Today screen: whether it is online, and a test tag to check the label
 * printer.
 */
const meta = {
	title: 'Admin/Today/Printing Station',
	component: Fixture,
	parameters: { shell: 'admin' },
	argTypes: { station: { control: 'inline-radio', options: ['online', 'offline', 'unknown'] } },
	args: { station: 'online' },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The station is up, and a test tag goes straight to it. */
export const Online: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('status')).toHaveTextContent(t.printStationCard.online);
		await userEvent.click(canvas.getByRole('button', { name: t.printStationCard.printTest }));
		await expect(await within(document.body).findByText(t.printStationCard.testSent)).toBeVisible();
	},
};

/** Nobody has started the station, so there is nothing to print a test tag on. */
export const Offline: Story = {
	args: { station: 'offline' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('status')).toHaveTextContent(t.printStationCard.offline);
		await expect(canvas.getByRole('button', { name: t.printStationCard.printTest })).toBeDisabled();
	},
};

/** A worker who can't run the queue sends no tags, so the section isn't there for them. */
export const Unknown: Story = {
	args: { station: 'unknown' },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).queryByRole('heading', { name: t.today.printingStation }),
		).toBeNull();
	},
};
