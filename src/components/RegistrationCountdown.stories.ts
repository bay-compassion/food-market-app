import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../locales';
import RegistrationCountdown from './RegistrationCountdown.vue';

/**
 * The clock shown above the sign-up form while registration is open, counting down to the moment
 * it closes. `GuestRegistrationForm` renders it only when `context === 'queue'` — genuinely open
 * right now, not a pre-registration window.
 *
 * The background blends from brand to danger color via CSS `color-mix()`, driven by a
 * `--registration-countdown-progress` custom property (`0` = brand, `1` = danger) rather than
 * snapping between fixed swatches. The blend starts at `transitionThresholdMs` remaining (default
 * five minutes) — a prop, not a constant, so a session with an unusually short or long window can
 * tune when it kicks in; the `CustomThreshold` story below exercises that.
 */
type RegistrationCountdownArgs = {
	locale: Locale;
	hoursRemaining: number;
	minutesRemaining: number;
	secondsRemaining: number;
	transitionThresholdMinutes: number;
};

function progressOf(canvasElement: HTMLElement) {
	const clock = canvasElement.querySelector('.registration-countdown-clock') as HTMLElement | null;

	return Number(clock?.style.getPropertyValue('--registration-countdown-progress'));
}

/**
 * The icon is the non-color signal that the clock has started blending toward the danger color
 * — color alone doesn't reliably read as "time is running out" for red-green color blindness.
 */
function hasIcon(canvasElement: HTMLElement) {
	return canvasElement.querySelector('.registration-countdown-icon') !== null;
}

const meta: Meta<RegistrationCountdownArgs> = {
	title: 'Guest/RegistrationCountdown',
	component: RegistrationCountdown,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		hoursRemaining: 0,
		minutesRemaining: 15,
		secondsRemaining: 0,
		transitionThresholdMinutes: 5,
	},
	render: (args) => ({
		components: { RegistrationCountdown },
		setup() {
			// A fixed pair, rather than a live-ticking ref, keeps the story stable rather than drifting
			// while it sits open (see `QueueGuestRow.stories.ts` for the same convention).
			const now = Date.now();
			const closesAt = new Date(
				now +
					(args.hoursRemaining * 3_600 + args.minutesRemaining * 60 + args.secondsRemaining) *
						1_000,
			);

			return {
				t: translations[args.locale],
				now,
				closesAt,
				transitionThresholdMs: args.transitionThresholdMinutes * 60_000,
			};
		},
		template: `
			<RegistrationCountdown
				:t="t"
				:now="now"
				:closes-at="closesAt"
				:transition-threshold-ms="transitionThresholdMs"
			/>
		`,
	}),
};

export default meta;

type Story = StoryObj<RegistrationCountdownArgs>;

/** Ahead of the threshold — pure brand color, and the common case while a guest fills out the
 *  form. */
export const PlentyOfTime: Story = {
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('15:00')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBe(0);
		await expect(hasIcon(canvasElement)).toBe(false);
	},
};

/** Halfway through the transition window (five minutes, by default) — the background is an even
 *  blend of brand and danger color. */
export const HalfwayThroughTransition: Story = {
	args: { minutesRemaining: 2, secondsRemaining: 30 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('02:30')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(0.5, 5);
		await expect(hasIcon(canvasElement)).toBe(true);
	},
};

/** Seconds from closing — the blend is nearly all the way to the danger color. */
export const NearlyClosed: Story = {
	args: { minutesRemaining: 0, secondsRemaining: 10 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('00:10')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(1, 1);
		await expect(hasIcon(canvasElement)).toBe(true);
	},
};

/**
 * The threshold is a prop, not a fixed constant: a ten-minute threshold means eight minutes left
 * is already 20% blended, well before the default five-minute threshold would have started
 * anything.
 */
export const CustomThreshold: Story = {
	args: { minutesRemaining: 8, transitionThresholdMinutes: 10 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('08:00')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(0.2, 5);
		await expect(hasIcon(canvasElement)).toBe(true);
	},
};

/**
 * The boundary the hours segment turns on at: one tick past a full hour left, and the display is
 * still `mm:ss`; at exactly an hour, `HH:` appears. Not a fixed cutoff picked because "windows are
 * usually short" — it's driven by the actual remaining time, so there's no length a window could
 * reach where the clock quietly stops making sense.
 */
export const JustUnderAnHour: Story = {
	args: { hoursRemaining: 0, minutesRemaining: 59, secondsRemaining: 59 },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('59:59')).toBeInTheDocument();
	},
};

/** The moment the hours segment appears. */
export const OneHourExactly: Story = {
	args: { hoursRemaining: 1, minutesRemaining: 0, secondsRemaining: 0 },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('01:00:00')).toBeInTheDocument();
	},
};

/** A longer window shows the hours digits rather than rolling over. */
export const OverAnHour: Story = {
	args: { hoursRemaining: 1, minutesRemaining: 23, secondsRemaining: 45 },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
