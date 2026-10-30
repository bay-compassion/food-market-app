import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useState } from 'react';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { SaturdayProgress } from '../../models/saturday-progress';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
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

function AfterDraw({ children }: { children: ReactNode }) {
	const [store] = useState(() => {
		const seeded = new RootStore();

		seeded.session.applyServerState({
			event: {
				id: 'timeline-story',
				status: SessionStatusEnum.SERVICE_STARTED,
				capacity: 100,
				registrationOpensAt: '2026-10-31T17:30:00Z',
				registrationClosesAt: '2026-10-31T17:45:00Z',
			},
			questions: [],
			counts: {},
		});

		return seeded;
	});

	return <RootStoreProvider store={store}>{children}</RootStoreProvider>;
}

const afterDraw: Decorator = (Story) => (
	<AfterDraw>
		<Story />
	</AfterDraw>
);

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
	decorators: [afterDraw],
	play: async ({ canvas }) => {
		const current = canvas.getAllByRole('listitem').find((step) => step.ariaCurrent === 'step');

		await expect(current).toHaveTextContent(copy.steps[2]?.title ?? '');
		await expect(canvas.getByText(copy.markerNow)).toBeInTheDocument();
		await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
		await expect(canvas.getByText(copy.steps[2]!.body)).toBeInTheDocument();
		await expect(canvas.getByText(copy.steps[3]!.body)).toBeInTheDocument();
	},
};

/** The draw has finished, and this guest has no number. */
export const AfterDrawWithoutNumber: Story = {
	decorators: [afterDraw],
	play: async ({ canvas }) => {
		await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
		await expect(canvas.getByText(copy.steps[2]!.title)).toHaveProperty('tagName', 'S');
		await expect(canvas.queryByText(copy.steps[2]!.body)).not.toBeInTheDocument();
		await expect(canvas.getByText(copy.steps[3]!.title)).toHaveProperty('tagName', 'S');
		await expect(canvas.queryByText(copy.steps[3]!.body)).not.toBeInTheDocument();
	},
};

/** The market has refreshed before the visit result: do not send a registered guest to travel. */
export const AwaitingResultAfterDraw: Story = {
	...AfterDrawWithoutNumber,
	args: { progress: SaturdayProgress.awaitingDraw },
};

/** A guest not selected in the draw sees which steps no longer apply and what to do next. */
export const NotSelected: Story = {
	...AfterDrawWithoutNumber,
	args: { progress: SaturdayProgress.notPlaced },
	play: async ({ canvas }) => {
		const events = canvas.getAllByRole('listitem');

		await expect(events).toHaveLength(5);
		await expect(events[2]).toHaveAttribute('data-state', 'skipped');
		await expect(events[3]).toHaveAttribute('data-state', 'skipped');
		await expect(events[4]).toHaveTextContent(copy.tryAgainNextWeek);
		await expect(events[4]).toHaveAttribute('aria-current', 'step');
		await expect(canvas.queryByText(copy.markerNext)).not.toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { progress: SaturdayProgress.travelling },
	globals: { locale: 'ar' },
};
