import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import {
	defaultVisitStatusArgs,
	SeededVisitStatus,
	visitStatusArgTypes,
	withIndicator,
} from './SeededVisitStatus.fixture';

const copy = translations.en.guestView.visitStatus;

/**
 * The `line-position-indicator` flag's fallbacks, kept apart from the design in
 * `Guest/Visit/Status`. `guests-ahead` puts the row of figures and the "guests ahead of you" count
 * under the guest's number; `none` leaves the number alone. Neither is the plan — a stakeholder
 * asked that guests not see how many are ahead of them — but both stay a flag change away.
 */
const meta = {
	title: 'Guest/Visit/Guests Ahead (Flagged)/Status',
	component: SeededVisitStatus,
	parameters: { shell: 'guest' },
	decorators: withIndicator('guests-ahead'),
	argTypes: visitStatusArgTypes,
	args: defaultVisitStatusArgs,
} satisfies Meta<typeof SeededVisitStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `guests-ahead`: the count of guests ahead, with the row of figures, in place of "now calling". */
export const Waiting: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(copy.waiting.guestsAheadLabel)).toBeInTheDocument();
	},
};

/** `guests-ahead`, next up: the count gives way to the "you're next" line, which only this
 *  fallback shows. */
export const WaitingNext: Story = {
	args: { visitStatus: 'waiting', queuePosition: 1, aheadOfYou: 0 },
};

/** `guests-ahead`, called: the row of figures ends at the cart, emphasized. */
export const Called: Story = {
	args: { visitStatus: 'called', queuePosition: 42 },
};

/** `none`: the guest's number stands alone. */
export const WaitingNoIndicator: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
	decorators: withIndicator('none'),
};

/** `none`, called: the panel reads fine with nothing under the number. */
export const CalledNoIndicator: Story = {
	args: { visitStatus: 'called', queuePosition: 42 },
	decorators: withIndicator('none'),
};
