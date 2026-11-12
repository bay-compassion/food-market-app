import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import {
	printStationFirstRunCommand,
	printStationLaunchCommand,
} from '../print-station/PrintStationSetup';
import { HelpView } from './HelpView';

type HelpViewArgs = {
	/** A fix a link on the Checklist asked for before it opened this screen. */
	requestedTopic: string | null;
};

const t = adminTranslations.en;
const reference = t.checklist.reference;
const printing = t.printStationCard;

/** A store holding the Checklist's request for a fix, as it would be after the link was followed. */
function SeededHelp({ requestedTopic }: HelpViewArgs) {
	const [store] = useState(() => {
		const created = new RootStore();

		if (requestedTopic) {
			created.checklist.reveal(requestedTopic);
		}

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<HelpView />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: HelpViewArgs) {
	return <SeededHelp key={args.requestedTopic ?? 'none'} {...args} />;
}

/**
 * What a team leader needs when something at the market goes wrong: the backup plans, then fixes
 * for common problems, starting the printing station by hand, and first-time setup.
 */
const meta = {
	title: 'Admin/Help/Help',
	component: Fixture,
	parameters: { shell: 'admin' },
	args: { requestedTopic: null },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The backup plans are shown open, in order, each the fallback for the one before. */
export const BackupPlans: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const items = within(canvas.getByRole('list')).getAllByRole('listitem');

		await expect(canvas.getByRole('heading', { name: t.help.backupPlans.title })).toBeVisible();
		await expect(items).toHaveLength(t.help.backupPlans.plans.length);

		for (const [index, plan] of t.help.backupPlans.plans.entries()) {
			await expect(items[index]).toHaveTextContent(plan.when);
		}
	},
};

/**
 * Troubleshooting, starting the printing station by hand, and first-time setup are folded below the
 * plans. Opened, the by-hand section gives the market-day command and the queue desk's address for
 * Chrome, and setup gives the command that prints through the dialog.
 */
export const WhenYouNeedIt: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const problem = printing.troubleshooting[0]!;

		await userEvent.click(canvas.getByRole('button', { name: reference.troubleshootingTitle }));
		await userEvent.click(canvas.getByRole('button', { name: problem.problem }));

		await expect(canvas.getByText(problem.fix)).toBeVisible();

		await expect(canvas.queryByText(printStationLaunchCommand)).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: reference.byHandTitle }));

		await expect(canvas.getByText(printStationLaunchCommand)).toBeVisible();
		await expect(canvas.getByText(`${window.location.host}/queue`)).toBeVisible();
		await expect(canvas.getByRole('link', { name: printing.open })).toHaveAttribute(
			'href',
			`${window.location.origin}/printing-station`,
		);

		await expect(canvas.queryByText(printStationFirstRunCommand)).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: reference.setupTitle }));

		await expect(canvas.getByText(printStationFirstRunCommand)).toBeVisible();
		await expect(printStationFirstRunCommand).not.toContain('--kiosk-printing');
		await expect(printStationLaunchCommand).toContain('--kiosk-printing');
	},
};

/** Arriving from the Checklist's certificate link, the fix it asked for is open and focused. */
export const RequestedFix: Story = {
	args: { requestedTopic: 'certificate-warning' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const problem = printing.troubleshooting.find(({ id }) => id === 'certificate-warning')!;

		await expect(
			await canvas.findByText(problem.fix.replaceAll('{host}', window.location.host)),
		).toBeVisible();
		await waitFor(() =>
			expect(canvas.getByRole('button', { name: problem.problem })).toHaveFocus(),
		);
	},
};
