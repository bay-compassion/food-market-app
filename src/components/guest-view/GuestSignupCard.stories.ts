import type { Meta, StoryObj } from '@storybook/vue3-vite';

import GuestSignupCard from './GuestSignupCard.vue';

/**
 * The `.checkin-card` shell every guest-facing state renders inside — see
 * `GuestRegistrationForm.stories.ts`, `GuestVisitStatus.stories.ts`, `GuestNotOpenState.stories.ts`,
 * `GuestRegistrationClosedState.stories.ts`, and `GuestServiceState.stories.ts` for the states
 * themselves. This component only owns the card chrome and its default slot — the notification
 * opt-in lives in its own card below this one, see `GuestNotificationCard.stories.ts`.
 */

const meta: Meta = {
	title: 'Guest/Session States/GuestSignupCard',
	component: GuestSignupCard,
	parameters: { shell: 'guest' },
	render: () => ({
		components: { GuestSignupCard },
		template: `
			<GuestSignupCard>
				<p>Whichever state component applies renders here.</p>
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
