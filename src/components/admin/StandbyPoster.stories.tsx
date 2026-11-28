import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { translations } from '../../locales';
import { StandbyPosterStore } from '../../stores/standby-poster.store';
import { StandbyPoster } from './StandbyPoster';

const t = adminTranslations.en.qrPosters;

type Args = { code: string | null };

/** The poster with a store that has already read `code`, so no request leaves the story. */
function Seeded({ code }: Args) {
	const [store] = useState(() => {
		const created = new StandbyPosterStore(() => Promise.resolve(code));

		void created.load();

		return created;
	});

	return <StandbyPoster store={store} />;
}

const meta = {
	title: 'Admin/Today/Standby Poster',
	component: Seeded,
	// Outside the dashboard frame, like the guest poster on `/qr-code`.
	parameters: { shell: 'bare' },
	args: { code: '7a0c6f2e-4b4d-4e0e-9d55-2f6a1c3b9e10.story-signature-abcdef' },
} satisfies Meta<typeof Seeded>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * What an admin prints for the market on a session's day: that session's standby code, in the
 * viewer's language, since guests read it.
 */
export const Poster: Story = {
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole('heading', { name: translations.en.standby.title }),
		).toBeVisible();
		await expect(canvas.getByRole('img', { name: t.standby })).toBeVisible();
		await expect(canvas.getByText(/\/standby#/)).toBeVisible();
	},
};

/** No session running: each session has its own code, so there's nothing to print yet. */
export const NoSession: Story = {
	args: { code: null },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.noSession)).toBeVisible();
	},
};
