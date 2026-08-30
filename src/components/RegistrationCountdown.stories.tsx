import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import type { Locale } from '../locales';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';
import { RegistrationCountdown } from './RegistrationCountdown';

/**
 * The clock shown above the sign-up form while registration is open, counting down to the moment
 * it closes. `GuestView` renders it immediately above `GuestCombinedForm` only when registration
 * is genuinely open, not during a pre-registration window.
 *
 * The background blends from brand to danger color via CSS `color-mix()`, driven by a
 * `--registration-countdown-progress` custom property (`0` = brand, `1` = danger) rather than
 * snapping between fixed swatches. The blend starts at five minutes remaining.
 */
type CountdownArgs = {
	locale: Locale;
	hoursRemaining: number;
	minutesRemaining: number;
	secondsRemaining: number;
};

function progressOf(canvasElement: HTMLElement) {
	const clock = canvasElement.querySelector('.registration-countdown-clock') as HTMLElement | null;

	return Number(clock?.style.getPropertyValue('--registration-countdown-progress'));
}

/**
 * The icon is the non-color signal that the clock has started blending toward the danger color —
 * color alone doesn't reliably read as "time is running out" for red-green color blindness.
 */
function hasIcon(canvasElement: HTMLElement) {
	return canvasElement.querySelector('.registration-countdown-icon') !== null;
}

/**
 * The component reads an absolute `closesAt` from the session store; a story is easier to drive —
 * and to read — in terms of how much time is left, so this seeds the matching server state.
 */
function RemainingTime({
	locale,
	hoursRemaining,
	minutesRemaining,
	secondsRemaining,
}: CountdownArgs) {
	const now = Date.now();
	const closesAt = new Date(
		now + (hoursRemaining * 3_600 + minutesRemaining * 60 + secondsRemaining) * 1_000,
	);
	const store = new RootStore();

	store.translations.setLanguage(locale);
	store.session.applyServerState({
		event: {
			id: 'countdown-story',
			status: SessionStatusEnum.REGISTRATION_OPEN,
			sessionMode: 'ad_hoc',
			capacity: 100,
			registrationOpensAt: new Date(now - 60_000).toISOString(),
			registrationClosesAt: closesAt.toISOString(),
		},
		questions: [],
		counts: {},
	});

	return (
		<RootStoreProvider store={store}>
			<RegistrationCountdown />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Market Status/Countdown',
	component: RemainingTime,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		hoursRemaining: 0,
		minutesRemaining: 15,
		secondsRemaining: 0,
	},
} satisfies Meta<typeof RemainingTime>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Ahead of the threshold — pure brand color, and the common case while a guest fills the form. */
export const PlentyOfTime: Story = {
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('15:00')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBe(0);
		await expect(hasIcon(canvasElement)).toBe(false);
	},
};

/**
 * Halfway through the transition window (five minutes, by default) — the background is an even
 * blend of brand and danger color.
 */
export const HalfwayThroughTransition: Story = {
	args: { minutesRemaining: 2, secondsRemaining: 30 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('02:30')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(0.5, 3);
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
