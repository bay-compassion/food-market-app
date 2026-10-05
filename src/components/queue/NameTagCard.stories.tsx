import type { Meta, StoryObj } from '@storybook/react-vite';

import type { Locale } from '../../locales';
import { NameTag } from '../../models/name-tag';
import { NameTagCard } from './NameTagCard';

type NameTagArgs = {
	firstName: string;
	lastName: string;
	queuePosition: number | null;
	locale: Locale;
};

function Tag(args: NameTagArgs) {
	return (
		<div style={{ maxWidth: 360, padding: 16 }}>
			<NameTagCard tag={new NameTag(args)} />
		</div>
	);
}

/**
 * The name tag a check-in volunteer writes out for a guest they have just called: first name and
 * last initial, place in line, and the language the guest registered in. Laid out at a badge
 * label's proportions, ready for a label printer later.
 */
const meta = {
	title: 'Queue/NameTagCard',
	component: Tag,
	parameters: { shell: 'bare' },
	argTypes: {
		locale: { control: 'select', options: ['en', 'es', 'tl', 'zh', 'fa', 'ar', 'vi', 'fr'] },
	},
	args: { firstName: 'Maria', lastName: 'Santos', queuePosition: 14, locale: 'es' },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No last name: the first name stands alone, with no stray initial. */
export const FirstNameOnly: Story = {
	args: { lastName: '' },
};

/** A long name has to wrap inside the label rather than run off it. */
export const LongName: Story = {
	args: { firstName: 'Maximiliana Guadalupe', lastName: 'de la Cruz', queuePosition: 128 },
};

/** A guest added by hand outside the draw has no place in line yet. */
export const Unplaced: Story = {
	args: { queuePosition: null, locale: 'en' },
};
