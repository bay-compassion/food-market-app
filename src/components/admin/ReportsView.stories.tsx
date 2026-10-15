import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { ReportsView } from './ReportsView';

const t = adminTranslations.en;
const originalFetch = window.fetch.bind(window);

/** Three Saturday sessions, as the session summary report returns them. */
const sessionSummary = [24, 17, 10].map((day, index) => ({
	sessionDate: `2026-10-${day}T17:30:00.000Z`,
	capacity: 12,
	signUps: [31, 22, 26][index]!,
	served: 12,
	noShows: index,
	notPlaced: [19, 10, 14][index]!,
	walkIns: 0,
	fillRate: 100,
}));

/**
 * Answers the reports endpoint with `sessionSummary`. The view fetches for itself with the
 * worker's token rather than through a store, so there is no API to hand a story; this page embeds
 * no other story that fetches, so replacing `fetch` here touches nothing else.
 */
const withReports: Decorator = (Story) => {
	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		return url.startsWith('/api/admin/reports')
			? Promise.resolve(Response.json({ rows: sessionSummary }))
			: originalFetch(input, init);
	};

	return <Story />;
};

/**
 * The reports screen: basic figures for a date range, for workers who need a number rather than
 * an analysis — anything deeper is exported. The reports are a row of pills, all in sight; the
 * rows are a table on a desk and a card each on a phone, where the table would scroll sideways
 * and hide the figures it is there to show.
 */
const meta = {
	title: 'Admin/Reports/Reports View',
	component: ReportsView,
	parameters: { shell: 'admin' },
	decorators: [withReports],
	args: { getAccessToken: () => Promise.resolve('story-token'), canExport: true },
} satisfies Meta<typeof ReportsView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A phone: one card per session, each figure labelled. */
export const OnAPhone: Story = {
	play: async ({ canvas }) => {
		const cards = within(
			await canvas.findByRole('list', { name: t.reportNames['session-summary'] }),
		);

		await expect(cards.getAllByRole('listitem')).toHaveLength(sessionSummary.length);
		await expect(cards.getAllByText(t.reportColumnLabels.signUps)).toHaveLength(3);
		await expect(canvas.queryByRole('table')).not.toBeInTheDocument();
	},
};

/** Picking another report presses its pill, and only its pill. */
export const PickingAReport: Story = {
	play: async ({ canvas }) => {
		const reports = within(canvas.getByRole('group', { name: t.reports }));
		const peopleServed = reports.getByRole('button', { name: t.reportNames['people-served'] });

		await userEvent.click(peopleServed);
		await expect(peopleServed).toHaveAttribute('aria-pressed', 'true');
		await expect(
			reports.getByRole('button', { name: t.reportNames['session-summary'] }),
		).toHaveAttribute('aria-pressed', 'false');
	},
};

/** A desk: the same rows as a table, which has the width to show every column at once. */
export const OnADesk: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('table')).toBeVisible();
		await expect(canvas.getAllByRole('row')).toHaveLength(sessionSummary.length + 1);
	},
};
