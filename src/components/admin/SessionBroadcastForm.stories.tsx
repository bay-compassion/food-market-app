import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { SessionBroadcastForm } from './SessionBroadcastForm';

const t = adminTranslations.en;

const meta = {
	title: 'Admin/SessionBroadcastForm',
	component: SessionBroadcastForm,
	parameters: { shell: 'admin' },
	args: {
		broadcast: { title: '', body: '' },
		onBroadcastChange: fn(),
		onSend: fn(),
	},
	decorators: [
		(Story, context) => {
			const [store] = useState(() => {
				const created = new RootStore();

				created.session.applyServerState({
					event: context.parameters.unavailable
						? null
						: {
								id: 'broadcast-story',
								status: SessionStatusEnum.REGISTRATION_OPEN,
								sessionMode: 'ad_hoc',
								registrationOpensAt: '2026-09-03T17:00:00Z',
								registrationClosesAt: '2026-09-03T18:00:00Z',
								capacity: 50,
							},
					questions: [],
					counts: {},
				});

				return created;
			});

			return (
				<RootStoreProvider store={store}>
					<Story />
				</RootStoreProvider>
			);
		},
	],
	render: function BroadcastStory(args) {
		const [broadcast, setBroadcast] = useState(args.broadcast);

		return (
			<SessionBroadcastForm {...args} broadcast={broadcast} onBroadcastChange={setBroadcast} />
		);
	},
} satisfies Meta<typeof SessionBroadcastForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compose: Story = {
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.type(canvas.getByLabelText(t.broadcastTitleLabel), 'Doors open');
		await userEvent.type(canvas.getByLabelText(t.broadcastMessageLabel), 'Come on in');
		await userEvent.click(canvas.getByRole('button', { name: t.broadcastSend }));
		await expect(args.onSend).toHaveBeenCalledOnce();
	},
};

export const Unavailable: Story = {
	parameters: { unavailable: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('status')).toHaveTextContent(t.broadcastUnavailable);
		await expect(canvas.queryByRole('button', { name: t.broadcastSend })).not.toBeInTheDocument();
	},
};
