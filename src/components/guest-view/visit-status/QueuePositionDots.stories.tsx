import type { Meta, StoryObj } from '@storybook/react-vite';

import { QueuePositionDots } from './QueuePositionDots';

/**
 * The decorative fixed-length line shared by `WaitingVisitStatus` and `CalledVisitStatus`, on its
 * own — the practical way to see where `linePosition` lands along the line, the cart itself
 * emphasized once reached, and the right-to-left mirroring, without waiting in a real queue.
 */
const meta = {
	title: 'Guest/Session States/QueuePositionDots',
	component: QueuePositionDots,
	parameters: { shell: 'guest' },
	args: { linePosition: 3 },
} satisfies Meta<typeof QueuePositionDots>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Reached the cart itself, one slot before any pip: `linePosition={0}` is what emphasizes the
 *  cart rather than a person figure. */
export const AtTheCart: Story = {
	args: { linePosition: 0 },
};

/** The pip right next to the cart — one slot further out than the cart itself, and the last stop
 *  before the guest is called. */
export const RightNextToCart: Story = {
	args: { linePosition: 1 },
};

/** Third in line: two pips between your own figure and the cart. */
export const ThirdInLine: Story = {};

/** As far back as the default 7-pip line can place you exactly — one more and the line would have
 *  to abstract, so this is the last position that still shows a real pip in every slot. */
export const AtTheBack: Story = {
	args: { linePosition: 7 },
};

/** One slot past what the line can show exactly: the pips behind your figure collapse into the
 *  dotted discontinuity mark, rather than growing the line past its fixed length. */
export const JustPastTheLine: Story = {
	args: { linePosition: 8 },
};

/** Far past the line's length — the same dotted discontinuity as just past it, since the row only
 *  has so many slots to draw regardless of how far back the guest actually is. */
export const BeyondTheLine: Story = {
	args: { linePosition: 25 },
};

/** Third in line under an RTL locale — the cart and the guest's figure should swap sides. */
export const ThirdInLineRightToLeft: Story = {
	globals: { locale: 'ar' },
};

/** The abstracted line under an RTL locale — the discontinuity mark should mirror along with
 *  everything else. */
export const BeyondTheLineRightToLeft: Story = {
	args: { linePosition: 25 },
	globals: { locale: 'ar' },
};

/** The called state under an RTL locale — the emphasized cart should still land on the correct
 *  side. */
export const AtTheCartRightToLeft: Story = {
	args: { linePosition: 0 },
	globals: { locale: 'ar' },
};

/** A shorter line: `pipCount` overrides the default of 7, and the "as far back as the line can
 *  place you exactly" boundary moves down along with it. */
export const FewerPips: Story = {
	args: { linePosition: 4, pipCount: 4 },
};
