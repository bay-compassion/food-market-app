import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import type { Locale } from '../../src/locales';
import {
	smsMessageParts,
	smsPrefix,
	smsUnsubscribe,
	type CustomNotification,
	type SmsMessageKind,
} from '../../src/services/notification-copy';
import { TextMessage } from './TextMessage';

type SpecimenArgs = {
	/** Driven by the toolbar's locale picker, per the repo's story convention. */
	locale: Locale;
	type: SmsMessageKind;
	queuePosition: number | null;
	custom?: CustomNotification;
};

function TextMessageSpecimen({ locale, type, queuePosition, custom }: SpecimenArgs) {
	return <TextMessage parts={smsMessageParts(locale, type, queuePosition, custom)} />;
}

/**
 * The text messages a guest is sent, for the review document to embed. Specimens rather than
 * components of the app, so they stay out of the sidebar, as the design tokens' do.
 */
const meta = {
	title: 'Guest/Text Message Specimens',
	component: TextMessageSpecimen,
	tags: ['!dev'],
	parameters: { shell: 'bare' },
	args: { locale: 'en', queuePosition: null },
	/** Check the two currently fixed pieces, and that nothing else is shaded. */
	play: async ({ canvasElement }) => {
		const shaded = [...canvasElement.querySelectorAll('[data-required]')].map(
			(element) => element.textContent,
		);

		await expect(shaded).toEqual([smsPrefix, smsUnsubscribe]);
	},
} satisfies Meta<typeof TextMessageSpecimen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Sent once, when the guest consents to text messages. */
export const Welcome: Story = { args: { type: 'welcome' } };

/** Sent when the guest is selected; the only message that carries their place in line. */
export const Selected: Story = { args: { type: 'lottery_selected', queuePosition: 7 } };

/** Sent when the guest is not selected. */
export const NotSelected: Story = { args: { type: 'lottery_not_selected' } };

/** Sent when a worker calls the guest. */
export const Called: Story = { args: { type: 'called' } };

/** A broadcast is written by staff each time, so this wording is an example. */
export const Broadcast: Story = {
	args: {
		type: 'broadcast',
		custom: {
			title: 'Market update',
			body: 'We are running about fifteen minutes behind. Thank you for your patience.',
		},
	},
};

/** Right-to-left rendering: the message reads from the right, the fixed English does not. */
export const RightToLeft: Story = {
	args: { type: 'called' },
	globals: { locale: 'ar' },
};
