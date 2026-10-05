import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { languages, type Locale } from '../../locales';
import { LanguagePill, type LanguagePillProps } from './LanguagePill';

/** `language` rather than the prop's own `locale`: the preview feeds the toolbar's locale into any
 *  arg of that name, which would pin every pill here to the toolbar's language. */
type Args = Omit<LanguagePillProps, 'locale'> & { language: Locale };

/**
 * One language in the kiosk's carousel, on the display's dark backdrop. The active pill's band is
 * the time its language has left, draining rightward with the carousel.
 */
const meta = {
	title: 'Kiosk/LanguagePill',
	parameters: { shell: 'bare' },
	argTypes: { language: { control: 'select', options: languages.map(({ code }) => code) } },
	args: { language: 'vi' },
	render: ({ language, ...props }) => <LanguagePill locale={language} {...props} />,
	decorators: [
		(Story) => (
			<ol
				style={{
					display: 'flex',
					margin: 0,
					padding: '24px',
					listStyle: 'none',
					background: 'var(--color-brand-dark)',
				}}
			>
				<Story />
			</ol>
		),
	],
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Waiting for its turn: outlined and dimmed. */
export const Inactive: Story = {};

/** Its turn, three seconds into eight: filled, with the band most of the way across. */
export const Active: Story = {
	args: { active: true, turn: { durationMs: 8_000, elapsedMs: 3_000 } },
	play: async ({ canvasElement }) => {
		const pill = canvasElement.querySelector('li')!;

		await expect(pill).toHaveTextContent('Tiếng Việt');
		await expect(pill).toHaveAttribute('data-active');
		await expect(pill).toHaveStyle({ '--turn-ms': '8000ms', '--turn-delay': '-3000ms' });
	},
};

/** Active with no turn to count down — filled, no band. */
export const ActiveWithoutCountdown: Story = {
	args: { active: true },
};

/** A right-to-left name keeps its joined script: the pill turns off its letter spacing. */
export const ArabicName: Story = {
	args: { language: 'ar', active: true, turn: { durationMs: 8_000, elapsedMs: 3_000 } },
};
