import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { LegalDocumentView } from './LegalDocumentView';
import privacyMarkdown from './privacy.md?raw';
import termsMarkdown from './terms.md?raw';

/**
 * The privacy policy and terms, rendered from the Markdown they are authored in. This is the
 * first React screen in the app; the route around it is still a thin Vue shell.
 *
 * The back label is the one piece of translated text here, so these stories take `locale` and
 * derive it, which also lets the toolbar's locale picker drive the right-to-left layouts.
 */
const meta = {
	title: 'Guest/LegalDocumentView',
	component: LegalDocumentView,
	parameters: { shell: 'guest' },
	args: { locale: 'en' as Locale },
	argTypes: {
		markdown: { control: false },
		backLabel: { control: false },
		onBack: { action: 'back' },
	},
	render: ({ locale, ...args }: { locale: Locale } & Parameters<typeof LegalDocumentView>[0]) => (
		<LegalDocumentView {...args} backLabel={translations[locale].backToGuest} />
	),
} satisfies Meta<{ locale: Locale } & Parameters<typeof LegalDocumentView>[0]>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrivacyPolicy: Story = {
	args: { markdown: privacyMarkdown, backLabel: '' },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		// Match the dictionary rather than a literal, so the assertion follows the locale picker.
		await expect(
			canvas.getByRole('link', { name: translations[args.locale].backToGuest }),
		).toBeInTheDocument();
		await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();
	},
};

export const Terms: Story = {
	args: { markdown: termsMarkdown, backLabel: '' },
};

/** The shortest possible document, for checking the frame rather than the content. */
export const Minimal: Story = {
	args: {
		backLabel: '',
		markdown: ['# Heading', '', 'A paragraph.', '', '- A list item', '', '_A footnote._'].join(
			'\n',
		),
	},
};
