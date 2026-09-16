import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminDashboardTabs } from './AdminDashboardTabs';
import type { AdminView } from './types';

const t = adminTranslations.en;

const items: { id: AdminView; label: string }[] = [
	{ id: 'current-session', label: t.currentSession },
	{ id: 'queue', label: t.queue },
	{ id: 'broadcast', label: t.broadcastTitle },
	{ id: 'question-bank', label: t.questionBank },
	{ id: 'guest-database', label: t.guestDatabase },
	{ id: 'session-history', label: t.historySessions },
	{ id: 'reports', label: t.reports },
];

const idFor = (view: AdminView) => ({ tab: `${view}-tab`, panel: `${view}-panel` });

const meta = {
	title: 'Admin/Shared/AdminDashboardTabs',
	component: AdminDashboardTabs,
	parameters: { shell: 'admin' },
	decorators: [
		// The panel the selected tab points at, which the dashboard layout supplies in the real app.
		(Story, context) => (
			<>
				<Story />
				<div
					className="admin-content"
					role="tabpanel"
					id={idFor(context.args.value).panel}
					aria-labelledby={idFor(context.args.value).tab}
				/>
			</>
		),
	],
	args: {
		items,
		value: 'queue',
		label: t.adminTitle,
		idFor,
		onChange: fn(),
	},
} satisfies Meta<typeof AdminDashboardTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The phone layout: one scrolling strip above the screen it selects. */
export const Horizontal: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const tab = canvas.getByRole('tab', { name: t.reports });

		await expect(canvas.getByRole('tab', { name: t.queue })).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await userEvent.click(tab);
		await expect(args.onChange).toHaveBeenCalledWith('reports');
	},
};

/** Past 860px the dashboard becomes two columns and the strip stacks in the sidebar. */
export const Vertical: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
	},
};

/**
 * A worker whose permissions do not cover the screen the URL asked for. No tab is selected rather
 * than MUI erroring on a value matching none of them.
 */
export const NoMatchingView: Story = {
	args: { value: 'dev-mode' },
	play: async ({ canvas }) => {
		const tabs = within(canvas.getByRole('tablist'));

		await expect(tabs.queryAllByRole('tab', { selected: true })).toHaveLength(0);
		// The strip still has a roving tab stop, so a keyboard can reach it with nothing selected.
		await expect(tabs.getByRole('tab', { name: t.currentSession })).toHaveAttribute(
			'tabindex',
			'0',
		);
	},
};
