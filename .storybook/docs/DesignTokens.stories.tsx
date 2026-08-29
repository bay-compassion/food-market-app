import type { Meta, StoryObj } from '@storybook/react-vite';

import { TokenTable } from './TokenTable';
import type { TokenTableProps, TypeScaleProps } from './types';
import { TypeScale } from './TypeScale';

/**
 * The specimens embedded in the Design System documentation pages.
 *
 * They are ordinary stories rather than components written inline in the MDX, so the specimens are
 * covered by `npm run test:storybook` like anything else. The MDX pages carry the prose and pull
 * each specimen in with `<Story of={...} />`. `!dev` keeps them out of the sidebar — they are only
 * meaningful inside the page that explains them.
 */
const meta: Meta<TokenTableProps> = {
	title: 'Design System/Specimens',
	component: TokenTable,
	tags: ['!dev'],
	parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<TokenTableProps>;

export const BrandColors: Story = {
	args: {
		preview: 'color',
		tokens: [
			['--color-brand', 'Top bar, hero, primary buttons, headings on admin screens'],
			['--color-brand-dark', 'Hover state for primary buttons'],
			['--color-on-brand', 'Text and borders on top of the brand color'],
		],
	},
};

export const SurfaceColors: Story = {
	args: {
		preview: 'color',
		tokens: [
			['--color-background', 'The page, cards, and form inputs'],
			[
				'--color-surface-soft',
				'Panels set apart from the page: queue standing, notification opt-in',
			],
		],
	},
};

export const TextColors: Story = {
	args: {
		preview: 'color',
		tokens: [
			['--color-text', 'Body copy and headings'],
			['--color-text-muted', 'Supporting copy inside a card'],
			['--color-text-subtle', 'Captions, counts, footer links, empty states'],
			['--color-placeholder', 'Input placeholder text only'],
			['--color-border', 'Input borders'],
		],
	},
};

export const SignalColors: Story = {
	args: {
		preview: 'color',
		tokens: [
			['--color-focus', 'The 3px focus ring on every focusable element'],
			[
				'--color-error',
				'Validation messages, the auth banner, the "called" state, and the color the registration countdown blends toward as time runs out',
			],
			['--color-success', 'The success severity of `Alert`'],
			['--color-warning', 'The warning severity of `Alert`'],
		],
	},
};

export const Radii: Story = {
	args: {
		preview: 'radius',
		tokens: [
			['--radius-sm', 'Small marks: the logo, the language picker'],
			['--radius-md', 'Inputs, inner panels, the success checkmark'],
			['--radius-lg', 'Cards and the hero — anything that frames a whole screen'],
			['--radius-pill', 'Buttons and counts'],
		],
	},
};

type TypeStory = StoryObj<TypeScaleProps>;

export const HeadingScale: TypeStory = {
	render: (args) => <TypeScale {...args} />,
	args: {
		token: '--font-heading',
		samples: [
			{ size: '38px', weight: 700, uppercase: true, usage: 'h1, set globally', text: 'Welcome' },
			{
				size: '29px',
				weight: 700,
				uppercase: true,
				usage: 'Heading inside the guest check-in card',
				text: "Join today's queue",
			},
			{
				size: '23px',
				weight: 700,
				uppercase: true,
				usage: 'Admin section heading',
				text: 'Waiting queue',
			},
			{ size: '14.5px', weight: 700, usage: 'Form field label', text: 'First name' },
		],
	},
};

export const BodyScale: TypeStory = {
	render: HeadingScale.render,
	args: {
		token: '--font-body',
		samples: [
			{
				size: '17px',
				weight: 400,
				usage: 'Lead paragraph',
				text: "Sign up when you arrive and we'll hold your place in line. We'll let you know when it's your turn.",
			},
			{
				size: '16px',
				weight: 400,
				usage: 'Supporting copy inside a card',
				text: 'Supporting copy inside a card, one step down from the lead paragraph.',
			},
			{
				size: '13px',
				weight: 400,
				usage: 'Captions and footer text',
				text: 'The smallest size used, and never for anything a guest must read.',
			},
		],
	},
};

export const QueueNumber: TypeStory = {
	render: HeadingScale.render,
	args: {
		token: '--font-heading',
		samples: [
			{
				size: '44px',
				weight: 700,
				usage: "The guest's place in the queue — the only thing on screen at this size",
				text: '7',
			},
		],
	},
};
