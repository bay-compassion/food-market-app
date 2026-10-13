import type { Meta, StoryObj } from '@storybook/react-vite';

import type { Locale } from '../../locales';
import { NameTag } from '../../models/name-tag';
import { NameTagCard } from './NameTagCard';

type NameTagArgs = {
	firstName: string;
	lastName: string;
	pronunciation: string | null;
	queuePosition: number | null;
	priorityNumber: number | null;
	locale: Locale;
};

function Tag({ printed, ...source }: NameTagArgs & { printed: boolean }) {
	return (
		// The printed label sets its own size in millimetres; only the on-screen card takes the width.
		<div style={{ maxWidth: printed ? undefined : 360, padding: 16 }}>
			<NameTagCard tag={new NameTag(source)} printed={printed} />
		</div>
	);
}

/**
 * The name tag a check-in volunteer writes out for a guest they have just called: first name and
 * last initial, how to say it when someone wrote that down, place in line, and the language the guest registered in. Drawn at the printed
 * label's proportions, so the card on screen and the label that prints match.
 */
const meta = {
	title: 'Staff/Queue Desk/Name Tag Card',
	component: Tag,
	parameters: { shell: 'bare' },
	argTypes: {
		locale: { control: 'select', options: ['en', 'es', 'tl', 'zh', 'fa', 'ar', 'vi', 'fr'] },
	},
	args: {
		firstName: 'Maria',
		lastName: 'Santos',
		pronunciation: null,
		queuePosition: 14,
		priorityNumber: null,
		locale: 'es',
		printed: false,
	},
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

/** A guest a worker put at the front ahead of others: a priority number, so nobody else's moves. */
export const PriorityNumber: Story = {
	args: { queuePosition: null, priorityNumber: 2 },
};

/** A guest added by hand outside the draw has no place in line yet. */
/** How to say the name, under it, for whoever reads the tag aloud. */
export const WithPronunciation: Story = {
	args: { firstName: 'Siobhan', lastName: 'Kelly', pronunciation: 'shi-VAWN', locale: 'en' },
};

/** A pronunciation as long as the field allows is cut to two lines rather than spilling off. */
export const LongPronunciation: Story = {
	args: {
		firstName: 'Nguyễn',
		lastName: 'Thị',
		pronunciation:
			'NWIN, like "win" with an n in front — the first syllable is said low and falling, then rising',
		locale: 'vi',
	},
};

export const Unplaced: Story = {
	args: { queuePosition: null, locale: 'en' },
};

/**
 * The label as it prints: its real size in millimetres (see `NameTag.label`), black only for a
 * thermal printer, and without the on-screen caption.
 */
export const PrintedLabel: Story = {
	args: { printed: true },
};

/** A long name on the printed label, set smaller to fit. */
export const PrintedLongName: Story = {
	args: { printed: true, firstName: 'Maximiliana Guadalupe', lastName: 'de la Cruz' },
};

/** How to say the name on the printed label, in black like everything else on it. */
export const PrintedWithPronunciation: Story = {
	args: { printed: true, firstName: 'Siobhan', lastName: 'Kelly', pronunciation: 'shi-VAWN' },
};
