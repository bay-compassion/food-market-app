import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { SaturdayProgress } from '../../models/saturday-progress';
import { GuestSaturdayTimeline } from './GuestSaturdayTimeline';

/**
 * How a market Saturday runs. Without a visit it teaches the day under "Every Saturday"; beside a
 * visit it marks the day off under "Today", from the visit's status rather than the clock.
 */
const meta = {
	title: 'Guest/Visit/Saturday Timeline',
	component: GuestSaturdayTimeline,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof GuestSaturdayTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

const copy = translations.en.guestView.notOpenState;

/** The closed market's timeline: every step explained, none marked. */
export const EverySaturday: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('heading', { name: copy.scheduleHeading })).toBeInTheDocument();
		await expect(canvas.getAllByRole('listitem')).toHaveLength(copy.steps.length);
	},
};

/** A registered guest, in the lottery: the draw is next. */
export const AwaitingDraw: Story = {
	args: { progress: SaturdayProgress.awaitingDraw },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('heading', { name: copy.todayHeading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.markerNext)).toBeInTheDocument();
	},
};

/** A guest holding a number: making their way to the market now. */
export const Travelling: Story = {
	args: { progress: SaturdayProgress.travelling },
	play: async ({ canvas }) => {
		const current = canvas.getAllByRole('listitem').find((step) => step.ariaCurrent === 'step');

		await expect(current).toHaveTextContent(copy.steps[2]?.title ?? '');
		await expect(canvas.getByText(copy.markerNow)).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { progress: SaturdayProgress.travelling },
	globals: { locale: 'ar' },
};
