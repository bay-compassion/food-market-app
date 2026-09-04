import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import DemoPreviewBanner from './DemoPreviewBanner';

function Fixture({ name }: { name: string }) {
	const [store] = useState(() => new RootStore({ previewName: name }));

	return (
		<RootStoreProvider store={store}>
			<DemoPreviewBanner />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Demo preview banner',
	component: Fixture,
	parameters: { shell: 'bare' },
} satisfies Meta<typeof Fixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { name: 'Ada Example' } };
export const LongName: Story = { args: { name: 'Alexandra Catherine Montgomery Example' } };
